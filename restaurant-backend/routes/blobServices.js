// backend/routes/blobServices.js
const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");

// Required env vars
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "menu-images";

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING in environment");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Make sure container exists
async function ensureContainer() {
  try {
    const exists = await containerClient.exists();
    if (!exists) await containerClient.create();
  } catch (err) {
    console.warn("Could not ensure container exists:", err.message);
  }
}
ensureContainer().catch(() => {});

// ✅ Upload function (same)
async function uploadToBlob(file) {
  const blobName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, "-")}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype || "application/octet-stream" },
  });

  return blockBlobClient.url; // full URL stored in DB
}

// ✅ Delete function (same)
async function deleteFromBlob(blobNameOrUrl) {
  try {
    const blobName = blobNameOrUrl.split("/").pop().split("?")[0]; // extract name if full URL
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    console.log(`Deleted blob ${blobName}`);
  } catch (err) {
    console.warn("deleteFromBlob error:", err.message);
  }
}

// ✅ Generate SAS URL safely
function generateSasUrl(blobNameOrUrl) {
  try {
    // Extract just the blob name from full URL
    const blobName = blobNameOrUrl.split("/").pop().split("?")[0];
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const expiresOn = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse("r"),
        startsOn: new Date(),
        expiresOn,
      },
      blobServiceClient.credential
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  } catch (err) {
    console.warn("generateSasUrl failed, returning original URL:", err.message);
    return blobNameOrUrl; // fallback
  }
}

module.exports = { uploadToBlob, deleteFromBlob, generateSasUrl };
