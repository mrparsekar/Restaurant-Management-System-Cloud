// backend/routes/blobServices.js
const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "menu-images";

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("❌ Missing Azure connection string in environment variables");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// ✅ Upload file buffer to Blob
async function uploadToBlob(file) {
  const blobName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  return blockBlobClient.url; // Return public (or SAS) URL
}

// ✅ Delete file from Blob
async function deleteFromBlob(blobName) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    console.log(`🗑️ Deleted blob: ${blobName}`);
  } catch (err) {
    console.error("⚠️ Error deleting blob:", err.message);
  }
}

// ✅ Generate SAS (for secure temporary access)
function generateSasUrl(blobName) {
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

module.exports = { uploadToBlob, deleteFromBlob, generateSasUrl };
