import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    active: { type: Boolean, default: true },
    interests: { type: [String], default: [] },
    homeCity: { name: String, lat: Number, lng: Number, state: String },
    prefs: {
      theme: { type: String, default: 'clay' },
      typeface: { type: String, default: 'classic' },
      lang: { type: String, default: 'en' },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    active: this.active,
    interests: this.interests,
    homeCity: this.homeCity,
    prefs: this.prefs,
  };
};

export default mongoose.model('User', userSchema);