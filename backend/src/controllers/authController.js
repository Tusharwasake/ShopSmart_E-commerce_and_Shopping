import { user } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { sendOtpEmail } from "../services/emailService.js";

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      message: "please enter in missing",
    });
  }

  const salt = 10;

  const hashPassword = await bcrypt.hash(password, salt);

  const payload = {
    username: username,
    email: email,
    password: hashPassword,
  };

  try {
    const users = await user.insertOne(payload);
    res.status(200).json({
      message: "Account created successfully",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "please enter in missing",
    });
  }

  try {
    const fetchUser = await user.findOne({ email });

    if (!fetchUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, fetchUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Generate tokens
    const accessToken = generateAccessToken(fetchUser);
    const refreshToken = generateRefreshToken(fetchUser);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: fetchUser._id,
        email: fetchUser.email,
        role: fetchUser.role,
      },
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// forgot password

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const userFetch = await user.findOne({ email });

    if (!userFetch) return res.status(404).json({ message: "User not found" });

    const resetToken = jwt.sign(
      { id: userFetch._id },
      process.env.RESET_PASSWORD_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    userFetch.otp = otp;
    userFetch.otpExpires = otpExpires;
    await userFetch.save();

    const emailResponse = await sendOtpEmail(userFetch.email, otp);

    if (!emailResponse.success) {
      return res.status(500).json({ message: emailResponse.message });
    }

    res.status(200).json({ message: "Password reset OTP Sent" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// reset password

const resetpassword = async (req, res) => {

  try {
    const { email, otp, newpassword } = req.body;

    if (!otp || !newpassword) {
      return res
        .status(400)
        .json({ message: "Invalid request. OTP and new password required." });
    }

    const fetchUser = await user.findOne({ email });

    if (!fetchUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if OTP is correct and has not expired
    
    if (fetchUser.otp != otp || new Date() > fetchUser.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    fetchUser.password = await bcrypt.hash(newpassword, salt);

    // Clear OTP fields after successful reset
    fetchUser.otp = null;
    fetchUser.otpExpires = null;
    await fetchUser.save();

    res.json({ message: "Password reset successful, you can login now" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
};

// refreshToken
const refreshToken = async (req, res) => {
  const refreshToken = req.cookie.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      role: decoded.role,
    });

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// logout

const logout = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.status(204).send(); // Respond with No Content
};



// In authController.js
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentUser = await user.findOne({ _id: userId });
    
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't send password back to client
    const { password, otp, otpExpires, ...userWithoutSensitiveInfo } = currentUser;
    
    res.status(200).json(userWithoutSensitiveInfo);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// In authController.js
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: "Current password and new password are required" 
      });
    }
    
    const userRecord = await user.findOne({ _id: userId });
    
    if (!userRecord) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword, 
      userRecord.password
    );
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    userRecord.password = await bcrypt.hash(newPassword, salt);
    
    await userRecord.save();
    
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// In authController.js
const verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    
    const userRecord = await user.findOne({ email });
    
    if (!userRecord) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (userRecord.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }
    
    if (userRecord.verificationCode !== verificationCode || 
        new Date() > userRecord.verificationExpires) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }
    
    userRecord.isEmailVerified = true;
    userRecord.verificationCode = null;
    userRecord.verificationExpires = null;
    await userRecord.save();
    
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const resendVerification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRecord = await user.findOne({ _id: userId });
    
    if (!userRecord) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (userRecord.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    userRecord.verificationCode = verificationCode;
    userRecord.verificationExpires = verificationExpires;
    await userRecord.save();
    
    // Send verification email using your email service
    const emailResponse = await sendVerificationEmail(userRecord.email, verificationCode);
    
    if (!emailResponse.success) {
      return res.status(500).json({ message: emailResponse.message });
    }
    
    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export {
  registerUser,
  loginUser,
  forgotPassword,
  resetpassword,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword,
  verifyEmail,
  resendVerification


};
