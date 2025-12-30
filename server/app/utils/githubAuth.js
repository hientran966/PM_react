import fs from "fs";
import jwt from "jsonwebtoken";
import { request } from "@octokit/request";

export const createAppJWT = () => {
  const privateKey = fs.readFileSync(
    process.env.GITHUB_PRIVATE_KEY_PATH,
    "utf8"
  );

  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iat: now - 60,
      exp: now + 540,
      iss: process.env.GITHUB_APP_ID,
    },
    privateKey,
    { algorithm: "RS256" }
  );
};

export const getInstallationAccessToken = async (installationId) => {
  const jwtToken = createAppJWT();

  try {
    const response = await request(
      `POST /app/installations/${installationId}/access_tokens`,
      {
        headers: {
          authorization: `Bearer ${jwtToken}`,
          accept: "application/vnd.github+json",
        },
      }
    );

    return response.data.token;
  } catch (err) {
    if (err.status === 404) {
      const error = new Error(
        "GitHub installation không hợp lệ hoặc đã bị gỡ cài đặt"
      );
      error.code = "GITHUB_INSTALLATION_INVALID";
      error.status = 400;
      throw error;
    }

    if (err.status === 401) {
      const error = new Error("GitHub App authentication failed");
      error.code = "GITHUB_APP_AUTH_FAILED";
      error.status = 500;
      throw error;
    }

    throw err;
  }
};