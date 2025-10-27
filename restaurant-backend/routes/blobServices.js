// backend/routes/blobServices.js
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_BLOB_CONTAINER;

// Create blob service client
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// ✅ Upload image to blob storage
export const uploadToBlob = async (file) => {
  try {
    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    console.log("✅ Uploaded to Blob Storage:", blobName);
    return `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}/${blobName}`;
  } catch (err) {
    console.error("❌ Error uploading to Blob Storage:", err);
    throw err;
  }
};

// ✅ Delete image from blob storage
export const deleteFromBlob = async (blobName) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    console.log("🗑️ Deleted from Blob Storage:", blobName);
  } catch (err) {
    console.error("❌ Error deleting blob:", err);
  }
};

// ✅ Generate secure SAS URL for private access
export const generateSasUrl = (blobName) => {
  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const container = process.env.AZURE_BLOB_CONTAINER;

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    // Generate SAS token valid for 24 hours
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // Read-only
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 24 * 60 * 60 * 1000),
      },
      sharedKeyCredential
    ).toString();

    return `https://${accountName}.blob.core.windows.net/${container}/${blobName}?${sasToken}`;
  } catch (err) {
    console.error("❌ Error generating SAS URL:", err);
    return null;
  }
};
