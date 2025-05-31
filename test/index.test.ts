import KiyvstarAdwisor from "../src";

console.clear();

const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

async function test() {
  try {
    const client_id = process.env.CLIENT_ID as string;
    const client_secret = process.env.CLIENT_SECRET as string;

    const adwisor = new KiyvstarAdwisor(client_id, client_secret, true);

    const sms = await adwisor.sendSMS("messagedesk", "+380501234567", "Test message from KiyvstarAdwisor");
    console.log("SMS send:", sms);

    await wait(5000);

    const id = sms.msgId;
    const response = await adwisor.checkSMS(id);
    console.log("SMS check:", response);
  } catch (error: any) {
    console.log(`Error with code [${error.code ?? 0}]: `, error.message);
  }
}

setTimeout(test, 1000);
