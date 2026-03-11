const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    //hashing password
    const hashedPassword = await bcrypt.hash(password, 10)
    // create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });



    res.status(201).json({
      message: "User registered successfully ✅",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error ❌", error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    // check if user exists using bcrypt to compare password
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 🔥 Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      twilio: {
        phoneNumber: user.twilio?.phoneNumber,
        isConnected: user.twilio?.isConnected,
      },
    };

    res.status(200).json({
      message: "Login successful ✅",
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error ❌", error: error.message });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true }
    );

    res.json({
      message: "Profile updated successfully ✅",
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update profile ❌",
      error: error.message,
    });
  }
};
exports.changePassword = async (req, res) => {
  try {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Old password incorrect ❌"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    res.json({
      message: "Password changed successfully ✅"
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to change password ❌",
      error: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found ❌",
      });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset",
      text: `Reset your password using this link: ${resetUrl}`,
    });

    res.json({
      message: "Password reset link sent to email ✅",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send reset email ❌",
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token ❌",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({
      message: "Password reset successful ✅",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reset password ❌",
      error: error.message,
    });
  }
};