const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let users = []; // You can replace this with a real database

// Endpoint to register user and send email
app.post("/register", async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  users.push({ email, username, password });

  // Configure your email transport (using Gmail as an example)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "your_email@gmail.com", // replace with your email
      pass: "your_app_password"     // use App Passwords if using Gmail
    },
  });

  const mailOptions = {
    from: "your_email@gmail.com",
    to: email,
    subject: "Welcome to Triple Zero Dispatch",
    text: `Hi ${username}, welcome to Triple Zero Dispatch Simulator!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "User registered and email sent" });
  } catch (err) {
    res.status(500).json({ error: "Email failed to send" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
function register() {
  const email = document.getElementById("email").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (email && username && password) {
    fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message || data.error);
    })
    .catch(err => {
      console.error(err);
      alert("Registration failed.");
    });
  } else {
    alert("Please fill in all registration details");
  }
}
