import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  image: {
    type: String,
    default: '/images/default-avatar.png',
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'editor'],
    default: 'user',
  },
  likes: {
    type: [{
      contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
      contentType: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }],
    default: [],
  },
  dislikes: {
    type: [{
      contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
      contentType: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }],
    default: [],
  },
  bookmarks: {
    type: [{
      contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
      contentType: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema); 