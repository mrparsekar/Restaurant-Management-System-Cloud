// backend/routes/blobServices.js
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "menu-images";

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("❌ Missing Azure connection string in environment variables");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// ✅ Upload file buffer to Blob
export async function uploadToBlob(file) {
  const blobName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  return blockBlobClient.url; // Return public (or SAS) URL
}

// ✅ Delete file from Blob
export async function deleteFromBlob(blobName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    console.log(`🗑️ Deleted blob: ${blobName}`);
  } catch (err) {
    console.error("⚠️ Error deleting blob:", err.message);
  }
}

// ✅ Generate SAS (for secure temporary access)
export function generateSasUrl(blobName) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const expiresOn = new Date(new Date().valueOf() + 3600 * 1000); // 1 hour expiry

  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    blobServiceClient.credential
  ).toString();

  return `${blockBlobClient.url}?${sas}`;
}
