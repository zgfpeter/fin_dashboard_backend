import { Schema, model, Document } from "mongoose";

import bcrypt from "bcrypt";

// user schema, this is what will be stored in the database for each user
// password will be salted and hashed with bcrypt, hash is stored in db
export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

// User Schema
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "users_db",
  }
);

// use the mongoose middleware pre("save") hook to hash the password

UserSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// helper method to compare passwords
UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

// hash password before saving
// pre("save") is a mongoose middleware and it runs:
// automatically every time a user is saved,
// before the data goes into the database
// guarantees never accidentally storing plain password
// hash password before saving
// UserSchema.pre<IUser>("save", async function () {
//   if (!this.isModified("password")) return;

//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

export default model<IUser>("User", UserSchema);
