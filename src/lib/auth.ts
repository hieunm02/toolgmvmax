const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-signing-key-gmv-max-os";

const encoder = new TextEncoder();

export async function signHmac(data: string, secret: string = JWT_SECRET): Promise<string> {
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function verifyToken(token: string, secret: string = JWT_SECRET): Promise<boolean> {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return false;
    
    const payload = atob(payloadBase64);
    const [username, expiryStr] = payload.split(":");
    if (username !== "admin") return false;
    
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Date.now()) return false;
    
    const expectedSignature = await signHmac(payloadBase64, secret);
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

export async function createSessionToken(username: string, expiryMs: number = 7 * 24 * 60 * 60 * 1000): Promise<string> {
  const expiry = Date.now() + expiryMs;
  const payload = `${username}:${expiry}`;
  const payloadBase64 = btoa(payload);
  const signature = await signHmac(payloadBase64);
  return `${payloadBase64}.${signature}`;
}
