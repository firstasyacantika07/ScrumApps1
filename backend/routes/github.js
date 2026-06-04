import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

/**
 * 1. Redirect ke GitHub OAuth
 */
router.get("/", (req, res) => {
  const redirectUri =
    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=read:user repo`;

  res.redirect(redirectUri);
});

/**
 * 2. Callback dari GitHub
 */
router.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    // exchange code -> access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      {
        headers: { Accept: "application/json" }
      }
    );

    const access_token = tokenResponse.data.access_token;

    // ambil data user
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const reposResponse = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    // simpan session sederhana
    req.session.github = {
      token: access_token,
      user: userResponse.data,
      repos: reposResponse.data
    };

    // redirect ke frontend dashboard
    res.redirect("http://localhost:3000/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed");
  }
});

/**
 * 3. Get profile dari frontend
 */
router.get("/profile", (req, res) => {
  if (!req.session.github) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  res.json(req.session.github);
});

export default router;