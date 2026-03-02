const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // create user
    const user = await User.create({
      name,
      email,
      password,
    });

    res.status(201).json({
      message: "User registered successfully ✅",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error ❌", error });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
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
    res.status(500).json({ message: "Server error ❌", error });
  }
};