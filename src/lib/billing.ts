import { Capacitor, registerPlugin } from "@capacitor/core";

export type Access = {
  mode: "test" | "store";
  entitled: boolean;
  price: string;
  trial: string;
  message: string;
};

type BillingPlugin = {
  getAccess: () => Promise<Access>;
  subscribe: () => Promise<Access>;
  restore: () => Promise<Access>;
};

const Billing = registerPlugin<BillingPlugin>("RealMindBilling");

const CLOSED: Access = {
  mode: "test",
  entitled: true,
  price: "R$ 5,99",
  trial: "7 dias",
  message: "",
};

export async function readAccess(): Promise<Access> {
  if (!Capacitor.isNativePlatform()) return CLOSED;
  try {
    return await Billing.getAccess();
  } catch {
    return { ...CLOSED, mode: "store", entitled: false, message: "Não consegui falar com a Play Store agora." };
  }
}

export async function startSubscription(): Promise<Access> {
  return Billing.subscribe();
}

export async function restoreSubscription(): Promise<Access> {
  return Billing.restore();
}
