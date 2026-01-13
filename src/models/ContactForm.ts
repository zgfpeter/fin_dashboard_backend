import mongoose, { Schema, model, Document } from "mongoose";

// interface - for TypeScript, like a blueprint on paper, compile-time shape and safety, does not exist at runtime, used only by typescript, prevents bugs before the code runs, helps editor with autocomplete and errors. After it's compiled to javascript, the interface disappears
// Extends Document because Document is a mongoose type that represents
// _id, .save(), .isModified(), .populate() etc
// By extending, i'm saying that this is a mongoose document plus all these fields
// TypeScript knows that contactform.save() is ok, contactform._id is ok etc

export interface IContactForm extends Document {
  reason: "Technical" | "Suggestion" | "Billing" | "Other";
  title: string;
  email: string;
  username?: string;
  message: string;

  messageStatus:
    | "pending"
    | "in_progress"
    | "waiting_for_user"
    | "resolved"
    | "closed"
    | "spam";
  createdAt: Date;
  updatedAt: Date;
}

// schema - mongoose, like the building rules, runtime validation and DB rules. A runtime definition of how data is validated, stored, transformed, indexed. Exists at runtime, mongodb actually uses them, typescript does not enforce them.

const ContactFormSchema = new Schema<IContactForm>(
  {
    reason: {
      type: String,
      enum: ["Technical", "Suggestion", "Billing", "Other"],
      default: "Other",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    messageStatus: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "waiting_for_user",
        "resolved",
        "closed",
        "spam",
      ],

      default: "pending",
    },
  },
  { timestamps: true, collection: "contactForm_db" }
);

export default model<IContactForm>("ContactForm", ContactFormSchema);
