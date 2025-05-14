// token generation
import jwt from "jsonwebtoken";
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};

export { generateAccessToken, generateRefreshToken };
