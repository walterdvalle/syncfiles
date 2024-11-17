"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymmetricEncryption = void 0;
const crypto = __importStar(require("crypto"));
class SymmetricEncryption {
    static algorithm = "aes-256-cbc";
    /**
     * Encripta uma string usando uma chave simétrica.
     * @param text Texto a ser encriptado.
     * @param key Chave simétrica (deve ter 32 bytes).
     * @returns Texto encriptado em formato string.
     */
    static encrypt(text, key) {
        if (key.length !== 32) {
            throw new Error("A chave deve ter exatamente 32 caracteres.");
        }
        const iv = crypto.randomBytes(16); // Vetor de inicialização (IV) de 16 bytes.
        const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key), iv);
        const encrypted = Buffer.concat([
            cipher.update(text, "utf8"),
            cipher.final(),
        ]);
        return `${iv.toString("base64")}:${encrypted.toString("base64")}`; // Retorna IV e texto criptografado separados por ':'.
    }
    /**
     * Decripta uma string previamente encriptada usando uma chave simétrica.
     * @param encryptedText Texto encriptado em formato string.
     * @param key Chave simétrica (deve ter 32 bytes).
     * @returns Texto decriptado.
     */
    static decrypt(encryptedText, key) {
        if (key.length !== 32) {
            throw new Error("A chave deve ter exatamente 32 caracteres.");
        }
        const [ivBase64, encryptedBase64] = encryptedText.split(":");
        if (!ivBase64 || !encryptedBase64) {
            throw new Error("O texto encriptado está em um formato inválido.");
        }
        const iv = Buffer.from(ivBase64, "base64");
        const encrypted = Buffer.from(encryptedBase64, "base64");
        const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(key), iv);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString("utf8");
    }
}
exports.SymmetricEncryption = SymmetricEncryption;
// Exemplo de uso:
const key = "23256dsfGSDF@$%(#ESADFG#/zasdfZX"; // Chave de 32 caracteres.
const originalText = `wmic process where "name='java.exe' and CommandLine like '%maven%'" get CommandLine`;
const encryptedText = SymmetricEncryption.encrypt(originalText, key);
const decryptedText = SymmetricEncryption.decrypt(encryptedText, key);
console.log("Texto original:", originalText);
console.log("Texto encriptado:", encryptedText);
console.log("Texto decriptado:", decryptedText);
//# sourceMappingURL=symmetricEncryption.js.map