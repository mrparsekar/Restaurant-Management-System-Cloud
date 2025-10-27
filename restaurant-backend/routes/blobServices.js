// routes/blobServices.js
import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";

dotenv.config();

// ✅ Load from your GitHub secret environment variable
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER || "menu-images";

if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.error("❌ Azure connection string missing in environment variables!");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

export const uploadToBlob = async (fileBuffer, fileName, mimeType) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });

    console.log(`✅ Uploaded to Blob Storage: ${fileName}`);
    return blockBlobClient.url;
  } catch (err) {
    console.error("❌ Blob upload failed:", err);
    throw err;
  }
};

export const deleteFromBlob = async (fileName) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.deleteIfExists();
    console.log(`🗑️ Deleted from Blob: ${fileName}`);
  } catch (err) {
    console.error("❌ Blob delete failed:", err);
  }
};
