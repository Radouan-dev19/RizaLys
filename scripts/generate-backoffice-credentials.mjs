import { randomBytes, scryptSync } from "node:crypto";

const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16);
const passwordHash = `scrypt$${salt.toString("base64url")}$${scryptSync(password, salt, 64).toString("base64url")}`;
const sessionSecret = randomBytes(48).toString("base64url");

console.log(`BACKOFFICE_PASSWORD=${password}`);
console.log(`BACKOFFICE_PASSWORD_HASH=${passwordHash.replaceAll("$", "\\$")}`);
console.log(`BACKOFFICE_SESSION_SECRET=${sessionSecret}`);
