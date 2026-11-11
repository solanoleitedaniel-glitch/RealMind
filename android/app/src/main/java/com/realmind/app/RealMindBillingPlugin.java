package com.realmind.app;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "RealMindBilling")
public class RealMindBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    static final String PRODUCT_ID = "realmind_mensal";

    private BillingClient billingClient;
    private boolean connecting = false;
    private final List<ReadyAction> queue = new ArrayList<>();
    private ProductDetails productDetails;
    private String offerToken = "";
    private String price = "R$ 5,99";
    private String trial = "7 dias";
    private PluginCall purchaseCall;

    private interface ReadyAction {
        void run(boolean ready);
    }

    @Override
    public void load() {
        billingClient =
            BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
    }

    private boolean debuggable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private JSObject access(boolean entitled, String message) {
        JSObject data = new JSObject();
        data.put("mode", debuggable() ? "test" : "store");
        data.put("entitled", debuggable() || entitled);
        data.put("price", price);
        data.put("trial", trial);
        data.put("message", message == null ? "" : message);
        return data;
    }

    private void whenReady(ReadyAction action) {
        if (billingClient != null && billingClient.isReady()) {
            action.run(true);
            return;
        }
        queue.add(action);
        if (connecting || billingClient == null) return;
        connecting = true;
        billingClient.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(BillingResult result) {
                    connecting = false;
                    boolean ok = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
                    List<ReadyAction> copy = new ArrayList<>(queue);
                    queue.clear();
                    for (ReadyAction pending : copy) pending.run(ok);
                }

                @Override
                public void onBillingServiceDisconnected() {
                    connecting = false;
                }
            }
        );
    }

    private void loadProduct(Runnable after) {
        if (productDetails != null) {
            after.run();
            return;
        }
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        );
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(products).build();
        billingClient.queryProductDetailsAsync(
            params,
            (BillingResult result, List<ProductDetails> details) -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && details != null) {
                    for (ProductDetails detail : details) {
                        if (PRODUCT_ID.equals(detail.getProductId())) {
                            productDetails = detail;
                            readOffer(detail);
                        }
                    }
                }
                after.run();
            }
        );
    }

    private void readOffer(ProductDetails detail) {
        List<ProductDetails.SubscriptionOfferDetails> offers = detail.getSubscriptionOfferDetails();
        if (offers == null) return;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            boolean free = false;
            String recurring = null;
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            for (ProductDetails.PricingPhase phase : phases) {
                if (phase.getPriceAmountMicros() == 0) free = true;
                else recurring = phase.getFormattedPrice();
            }
            if (offerToken.isEmpty() || free) {
                offerToken = offer.getOfferToken();
                if (recurring != null) price = recurring;
                trial = free ? "7 dias" : "";
            }
        }
    }

    private void queryEntitlement(PluginCall call) {
        if (debuggable()) {
            call.resolve(access(true, ""));
            return;
        }
        whenReady(
            ready -> {
                if (!ready) {
                    call.resolve(access(false, "A Play Store ainda não conectou."));
                    return;
                }
                loadProduct(
                    () -> {
                        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                            .setProductType(BillingClient.ProductType.SUBS)
                            .build();
                        billingClient.queryPurchasesAsync(
                            params,
                            (result, purchases) -> {
                                boolean entitled = false;
                                if (purchases != null) {
                                    for (Purchase purchase : purchases) {
                                        if (
                                            purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED &&
                                            purchase.getProducts().contains(PRODUCT_ID)
                                        ) {
                                            entitled = true;
                                            acknowledge(purchase);
                                        }
                                    }
                                }
                                String message = "";
                                if (!entitled && productDetails == null) {
                                    message = "A assinatura realmind_mensal ainda não está ativa na Play Console.";
                                }
                                call.resolve(access(entitled, message));
                            }
                        );
                    }
                );
            }
        );
    }

    private void acknowledge(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken())
            .build();
        billingClient.acknowledgePurchase(params, result -> {});
    }

    @PluginMethod
    public void getAccess(PluginCall call) {
        queryEntitlement(call);
    }

    @PluginMethod
    public void restore(PluginCall call) {
        queryEntitlement(call);
    }

    @PluginMethod
    public void subscribe(PluginCall call) {
        if (debuggable()) {
            call.resolve(access(true, ""));
            return;
        }
        whenReady(
            ready -> {
                if (!ready) {
                    call.resolve(access(false, "A Play Store ainda não conectou."));
                    return;
                }
                loadProduct(
                    () -> {
                        Activity activity = getActivity();
                        if (activity == null || productDetails == null || offerToken.isEmpty()) {
                            call.resolve(
                                access(
                                    false,
                                    "Crie a assinatura realmind_mensal na Play Console, a R$ 5,99 por mês, com 7 dias de teste."
                                )
                            );
                            return;
                        }
                        purchaseCall = call;
                        List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
                        list.add(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails)
                                .setOfferToken(offerToken)
                                .build()
                        );
                        BillingFlowParams flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(list).build();
                        BillingResult launched = billingClient.launchBillingFlow(activity, flow);
                        if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                            purchaseCall = null;
                            call.resolve(access(false, "A Play Store não abriu a assinatura agora."));
                        }
                    }
                );
            }
        );
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = purchaseCall;
        purchaseCall = null;
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            boolean entitled = false;
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    entitled = true;
                    acknowledge(purchase);
                }
            }
            if (call != null) call.resolve(access(entitled, ""));
            return;
        }
        if (call != null) {
            String message = code == BillingClient.BillingResponseCode.USER_CANCELED
                ? "Tudo bem. A assinatura não foi iniciada."
                : "A Play Store não concluiu a assinatura.";
            call.resolve(access(false, message));
        }
    }
}
