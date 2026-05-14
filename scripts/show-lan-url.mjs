/**
 * 同一 Wi-Fi のスマホから dev サーバーに繋ぐときの URL を表示する。
 * 使い方: npm run dev:lan を別ターミナルで起動したあと、本スクリプトを実行。
 */
import os from "node:os";

const port = process.env.PORT || "3000";
const nets = os.networkInterfaces();
const rows = [];

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    const fam = net.family;
    if (fam !== "IPv4" && fam !== 4) continue;
    if (net.internal) continue;
    rows.push({ name, address: net.address });
  }
}

if (rows.length === 0) {
  console.log("IPv4 の LAN アドレスが見つかりませんでした。ipconfig で確認してください。");
  process.exit(0);
}

console.log("スマホのブラウザで、次のいずれかを開いてください（PC と同じ Wi-Fi）:\n");
for (const { name, address } of rows) {
  console.log(`  http://${address}:${port}   （${name}）`);
}
console.log("\n※ 先にプロジェクトで npm run dev:lan を起動しておいてください。");
console.log("※ 繋がらない場合は Windows ファイアウォールで Node または TCP " + port + " を許可してください。");
