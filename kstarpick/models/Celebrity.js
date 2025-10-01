import mongoose from 'mongoose';

const CelebritySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide celebrity name'],
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  koreanName: {
    type: String,
    maxlength: [100, 'Korean name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  profileImage: {
    type: String,
    default: '/images/placeholder.jpg'
  },
  coverImage: {
    type: String
  },
  category: {
    type: String,
    enum: ['idol', 'actor', 'actress', 'model', 'solo', 'band', 'rookie', 'other'],
    default: 'idol'
  },
  role: {
    type: String,
    required: [true, 'Please provide celebrity role'],
    maxlength: [100, 'Role cannot be more than 100 characters']
  },
  agency: {
    type: String,
    maxlength: [100, 'Agency cannot be more than 100 characters']
  },
  debutDate: {
    type: Date
  },
  birthDate: {
    type: Date
  },
  socialMedia: {
    instagram: String,
    twitter: String,
    youtube: String,
    weverse: String,
    melon: String,
    spotify: String,
    tiktok: String,
    fancafe: String
  },
  socialMediaFollowers: {
    instagram: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    youtube: { type: Number, default: 0 },
    spotify: { type: Number, default: 0 },
    tiktok: { type: Number, default: 0 },
    fancafe: { type: Number, default: 0 }
  },
  socialMediaRankings: {
    instagram: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    youtube: { type: Number, default: 0 },
    spotify: { type: Number, default: 0 },
    tiktok: { type: Number, default: 0 },
    fancafe: { type: Number, default: 0 }
  },
  socialMediaChanges: {
    instagram: { count: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    twitter: { count: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    youtube: { count: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    spotify: { count: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    tiktok: { count: { type: Number, default: 0 }, percent: { type: Number, default: 0 } },
    fancafe: { count: { type: Number, default: 0 }, percent: { type: Number, default: 0 } }
  },
  socialMediaUpdatedAt: {
    type: Date,
    default: Date.now
  },
  musicVideos: [{
    title: String,
    youtubeUrl: String,
    views: Number,
    dailyViews: Number,
    publishedAt: Date,
    likes: Number,
    thumbnails: {
      default: { url: String, width: Number, height: Number },
      medium: { url: String, width: Number, height: Number },
      high: { url: String, width: Number, height: Number }
    },
    artists: [String]
  }],
  bio: {
    type: String,
    maxlength: [2000, 'Bio cannot be more than 2000 characters']
  },
  followers: {
    type: Number,
    default: 0
  },
  group: {
    type: String,
    maxlength: [100, 'Group name cannot be more than 100 characters']
  },
  position: {
    type: String,
    maxlength: [100, 'Position cannot be more than 100 characters']
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create slug from name before saving
CelebritySchema.pre('save', function(next) {
  this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  this.updatedAt = Date.now();
  next();
});

// Use existing Celebrity model or create a new one
export default mongoose.models.Celebrity || mongoose.model('Celebrity', CelebritySchema); 