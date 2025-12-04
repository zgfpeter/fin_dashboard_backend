import { parse } from "csv-parse/sync";

export default function ParseFile(buffer: Buffer | undefined) {
  if (!buffer) return []; // nothing to parse, maybe return an error?

  const text = buffer.toString("utf-8"); // convert bytes to string
  const records = parse(text, {
    columns: true, // first row as column names
    skip_empty_lines: true, // skip blank lines
  });

  return records; // array of objects, just like in my database
}

// after running this, should give me [{date:"2025-01-02",description:"Netflix",amount:"5"}]

// import file
// ! NOT GREAT, IDEALLY THE USER SHOULD BE ABLE TO UPLOAD DATA SEPARATELY
// !FOR EXAMPLE, UPLOAD CHARGES, UPLOAD TRANSACTIONS ETC, SO A DIFFERENT BUTTON FOR EACH IMPORT
// const storage = multer.memoryStorage(); // keeps file in memory
// // max size 1MB
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
// });
// router.post("/upload", upload.single("file"), (req, res) => {
//   const file = req.file; // this file is the uploaded file
//   if (!file) {
//     return res.status(400).json({ message: "No file uploaded" });
//   } else {
//     const parsedRecords = ParseFile(req?.file?.buffer);
//     console.log(parsedRecords);
//   }

//   console.log("Received file: ", file.originalname);
//   console.log("Buffer size: ", file.buffer.length);

//   res.send({ success: true, filename: file.originalname });
// });
