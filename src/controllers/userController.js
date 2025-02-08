import { user } from "../models/User.js";
import bcrypt from "bcrypt";

const userProfileUpdate = async (req, res) => {
  try {
    const { username, phone, address, oldPassword, newPassword } = req.body;

    const fetchUser = await user.find(req.user.userId);
    if (!fetchUser) return res.status(404).json({ message: "User not found" });

    if (username) fetchUser.username = username;
    if (phone) user.phone = phone;

    if (address) {
      fetchUser.address.street = address.street || fetchUser.address.street;
      fetchUser.address.city = address.city || fetchUser.address.city;
      fetchUser.address.state = address.state || fetchUser.address.state;
      fetchUser.address.country = address.country || fetchUser.address.country;
      fetchUser.address.zipCode = address.zipCode || fetchUser.address.zipCode;
    }

    if (oldPassword && newPassword) {
      const isMatched = await bcrypt.compare(oldPassword, fetchUser.password);
      if (!isMatched) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }
      const salt = await bcrypt.genSalt(10);
      fetchUser.password = await bcrypt.hash(newPassword, salt);
    }

    await fetchUser.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const fetchUser = await user.findOne({ _id: userId });
    console.log(fetchUser);

    const payload = {
      email: fetchUser.email,
      username: fetchUser.username,
    };

    res.status(200).json({ message: payload });
  } catch (error) {
    console.log(error.message);
  }
};

export { userProfileUpdate, getUserProfile };
