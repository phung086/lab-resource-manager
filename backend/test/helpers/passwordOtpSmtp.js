import assert from "node:assert/strict";
import net from "node:net";

// Exercise the real SMTP transport on loopback; codes stay inside the test.
export async function startPasswordOtpSmtp() {
  const messages = [];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.setEncoding("utf8");
    socket.write("220 password-fixture.local ESMTP\r\n");
    let buffer = "", raw = "", recipient = "", data = false, auth = false;
    socket.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const index = buffer.indexOf("\r\n"), line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (data) {
          if (line !== ".") { raw += line.replace(/^\.\./, ".") + "\r\n"; continue; }
          messages.push({ recipient, raw });
          raw = ""; data = false;
          socket.write("250 2.0.0 Message accepted\r\n");
        } else if (auth) {
          auth = false; socket.write("235 2.7.0 Authentication successful\r\n");
        } else if (/^EHLO /i.test(line)) {
          socket.write("250-password-fixture.local\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n");
        } else if (/^AUTH PLAIN/i.test(line)) {
          if (line.split(" ").length >= 3) socket.write("235 2.7.0 Authentication successful\r\n");
          else { auth = true; socket.write("334 \r\n"); }
        } else if (/^RCPT TO:/i.test(line)) {
          recipient = line.match(/<([^>]+)>/)[1]; socket.write("250 2.1.5 OK\r\n");
        } else if (/^DATA$/i.test(line)) {
          data = true; socket.write("354 End with dot\r\n");
        } else if (/^QUIT$/i.test(line)) socket.end("221 2.0.0 Bye\r\n");
        else socket.write("250 2.1.0 OK\r\n");
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1", SMTP_PORT: String(server.address().port),
    SMTP_USER: "fixture", SMTP_PASS: "fixture-only",
    EMAIL_FROM: '"LAB Fixture" <sender@password.test>'
  });
  return {
    codeFor(recipient) {
      const message = messages.findLast((row) => row.recipient === recipient);
      assert.ok(message, "A real SMTP message must be accepted for the account email");
      const code = message.raw.match(/\b\d{6}\b/)?.[0];
      assert.ok(code, "The accepted SMTP message must contain the verification code");
      return code;
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  };
}
