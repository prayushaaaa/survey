const { sign, verify } = require("jsonwebtoken");

const createTokens = (user) => {
  const accessToken = sign(
    { id: user.id },
    "i5t39t4uruih34h35huh6hi56uibefdvfxse"
  );
  return accessToken;
};

const validateToken = (req, res, next) => {
  const accessToken = req.cookies["access-token"];

  if (!accessToken) {
    return res.status(400).json({ error: "User not authenticated" });
  }

  try {
    const validToken = verify(
      accessToken,
      "i5t39t4uruih34h35huh6hi56uibefdvfxse"
    );
    if (validToken) {
      req.authenticated = true;
      req.id = validToken.id;

      return next();
    }
  } catch (err) {
    return res.staus(400).json({ error: err });
  }
};

module.exports = { createTokens, validateToken };
