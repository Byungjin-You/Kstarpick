import mongoose from 'mongoose';

const ContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title for this content'],
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  originalTitle: {
    type: String,
    required: false,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  content: {
    type: String,
    required: [true, 'Please provide content for this content'],
  },
  summary: {
    type: String,
    required: [true, 'Please provide a summary for this content'],
    maxlength: [1000, 'Summary cannot be more than 1000 characters'],
  },
  coverImage: {
    type: String,
    required: [true, 'Please provide a cover image for this content'],
  },
  bannerImage: {
    type: String,
    required: false,
    default: '',
  },
  trailerUrl: {
    type: String,
    required: false,
    default: '',
  },
  // 콘텐츠 타입으로 드라마와 영화를 구분
  contentType: {
    type: String,
    required: [true, 'Please select a content type'],
    enum: ['drama', 'movie', 'variety', 'documentary', 'other'],
  },
  status: {
    type: String,
    required: [true, 'Please select a status for this content'],
    enum: ['ongoing', 'completed', 'upcoming', 'canceled'],
    default: 'ongoing',
  },
  network: {
    type: String,
    required: false,
  },
  releaseDate: {
    type: Date,
    required: [true, 'Please provide a release date for this content'],
  },
  rating: {
    type: Number,
    required: false,
    min: [0, 'Rating cannot be less than 0'],
    max: [10, 'Rating cannot be more than 10'],
    default: 0,
  },
  reviewRating: {
    type: Number,
    min: [0, 'Review rating cannot be less than 0'],
    max: [10, 'Review rating cannot be more than 10'],
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  ratingDistribution: {
    type: [Number],
    default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    validate: {
      validator: function(v) {
        return v.length === 10;
      },
      message: 'Rating distribution must have exactly 10 values'
    }
  },
  runtime: {
    type: String,
    required: false,
  },
  ageRating: {
    type: String,
    required: false,
    enum: ['ALL', '12', '15', '18', 'R', 'PG-15', '15세 이상'],
  },
  director: {
    type: String,
    required: false,
  },
  country: {
    type: String,
    required: false,
  },
  tags: {
    type: [String],
    default: [],
  },
  genres: {
    type: [String],
    default: [],
  },
  cast: {
    type: [{
      name: { type: String, required: true },
      role: { type: String },
      image: { type: String },
      order: { type: Number, default: 0 }
    }],
    default: [],
  },
  watchProviders: {
    type: [{
      name: { type: String, required: false },
      logo: { type: String },
      type: { 
        type: String, 
        enum: ['subscription', 'rental', 'purchase', 'free'],
        required: false
      },
      price: { type: String },
      quality: [String],
      url: { type: String },
      order: { type: Number, default: 0 }
    }],
    default: [],
  },
  videos: {
    type: [{
      title: { type: String },
      type: { 
        type: String, 
        enum: ['trailer', 'teaser', 'ad', 'making-of', 'clip', 'interview', 'other'], 
        required: true 
      },
      url: { type: String, required: true },
      order: { type: Number, default: 0 }
    }],
    default: [],
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  orderNumber: {
    type: Number,
    default: 0,
    index: true,
  },
  lang: {
    type: String,
    required: true,
    enum: ['en', 'ko', 'ja', 'zh', 'es'],
    default: 'ko',
  },
  translationOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    default: null,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  dislikes: {
    type: Number,
    default: 0,
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

// 슬러그 및 인덱스 생성
ContentSchema.index({ slug: 1, lang: 1 }, { unique: true });
ContentSchema.index({ contentType: 1 });
ContentSchema.index({ featured: 1 });
ContentSchema.index({ releaseDate: -1 });
ContentSchema.index({ createdAt: -1 });
ContentSchema.index({ reviewRating: -1 });

export default mongoose.models.Content || mongoose.model('Content', ContentSchema); 