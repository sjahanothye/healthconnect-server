const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'healthconnect_super_secret_jwt_key_2026';

// Password Validation Helper
// Must have uppercase, lowercase, and at least 6 characters
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasValidLength = password.length >= 6;
  return hasUpperCase && hasLowerCase && hasValidLength;
};

// 1. Register Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, photoURL, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must have at least 6 characters, including at least one uppercase and one lowercase letter.',
      });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({
        success: false,
        message: 'Database connection is not available. Please verify MongoDB connection.',
      });
    }

    const { usersCollection } = collections;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await usersCollection.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      photoURL: photoURL ? photoURL.trim() : '',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      authProvider: 'email-password',
    };

    const result = await usersCollection.insertOne(newUser);

    const token = jwt.sign(
      {
        id: result.insertedId.toString(),
        email: newUser.email,
        name: newUser.name,
        photoURL: newUser.photoURL,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to HealthConnect.',
      token,
      user: {
        id: result.insertedId.toString(),
        name: newUser.name,
        email: newUser.email,
        photoURL: newUser.photoURL,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
    });
  }
});

// 2. Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({
        success: false,
        message: 'Database connection is not available.',
      });
    }

    const { usersCollection } = collections;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No user found with this email.',
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account was registered using Google. Please sign in with Google.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password combination.',
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully. Welcome back!',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
    });
  }
});

// 3. Google Login / Register Route
router.post('/google', async (req, res) => {
  try {
    const { email, name, photoURL, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google authentication.',
      });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({
        success: false,
        message: 'Database connection is not available.',
      });
    }

    const { usersCollection } = collections;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await usersCollection.findOne({ email: normalizedEmail });

    if (!user) {
      let hashedPassword = null;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name ? name.trim() : 'Member'
      )}&background=059669&color=fff&bold=true`;

      const newUser = {
        name: name ? name.trim() : 'Community Member',
        email: normalizedEmail,
        photoURL: photoURL || defaultAvatar,
        password: hashedPassword,
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // If user exists and password is provided, verify or set
      if (user.password && password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Incorrect password for this existing account.',
          });
        }
      } else if (!user.password && password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
      }

      // Update name / photoURL if provided
      const updateFields = {
        lastLoginAt: new Date().toISOString(),
      };
      if (name) updateFields.name = name.trim();
      if (photoURL) updateFields.photoURL = photoURL.trim();

      await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
      if (name) user.name = name.trim();
      if (photoURL) user.photoURL = photoURL.trim();
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Google login successful!',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during Google authentication.',
    });
  }
});

// 4. Get Current User Profile (Protected)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const collections = getCollections();
    if (!collections) {
      return res.json({ success: true, user: req.user });
    }

    const { usersCollection } = collections;
    const user = await usersCollection.findOne(
      { email: req.user.email.toLowerCase() },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
  }
});

// 5. Update Profile (Protected - Optional Challenge requirement)
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, photoURL } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }

    const collections = getCollections();
    if (!collections) {
      return res.status(500).json({ success: false, message: 'Database unavailable' });
    }

    const { usersCollection } = collections;
    const updatedFields = {
      name: name.trim(),
    };
    if (photoURL) {
      updatedFields.photoURL = photoURL.trim();
    }

    await usersCollection.updateOne(
      { email: req.user.email.toLowerCase() },
      { $set: updatedFields }
    );

    const updatedUser = await usersCollection.findOne(
      { email: req.user.email.toLowerCase() },
      { projection: { password: 0 } }
    );

    const newToken = jwt.sign(
      {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        name: updatedUser.name,
        photoURL: updatedUser.photoURL,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      token: newToken,
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        photoURL: updatedUser.photoURL,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;

