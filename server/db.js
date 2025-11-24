import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const UserData = mongoose.model('UserData', userSchema);

export const getValue = async (key) => {
    const doc = await UserData.findOne({ key });
    return doc ? doc.value : null;
};

export const setValue = async (key, value) => {
    await UserData.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
    );
};

export const getAllData = async () => {
    const docs = await UserData.find({});
    return docs.reduce((acc, doc) => {
        acc[doc.key] = doc.value;
        return acc;
    }, {});
};
