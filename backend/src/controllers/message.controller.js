import User from "../models/user.model.js";
import Message from "../models/message.model.js";

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-clerkId");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    // Currently login user ki MongoDB ID
    const loggedInUserId = req.user._id;

    // Yahan simple find() ke bajaye aggregation use kar rahe hain
    // kyunki hume messages ko multiple steps me process karna hai
    const conversations = await Message.aggregate([
      //sirf meri conversations wale messages rakho
      // matlab message me main sender hoon
      // ya main receiver hoon

      {
        $match: {
          $or: [
            {
              senderId: loggedInUserId,
            },
            {
              receiverId: loggedInUserId,
            },
          ],
        },
      },

      // ab same person ke saare messages ko ek jagah group karo

      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },

          lastMessageAt: { $max: "$createdAt" },
        },
      },

      // jiske saath sabse recently chat hui hai

      { $sort: { lastMessageAt: -1 } },

      // abhi hamare paas sirf doosre user ki ID hai, hume
      // uski profile info bhi chaayie

      {
        $lookup: {
          from: "users",

          // Hamare paas jo partner ki ID hai
          localField: "_id",

          // Users collection me is ID se match karo
          foreignField: "_id",

          // Jo user milega usko "user" ke andar rakho
          as: "user",
        },
      },

      // lookup ka result array ke andar aata hai ek array me
      //  jisme object hai
      // user: [
      //   { name: "Rahul", ... }
      // ]
      //
      // Hume array nahi, direct Rahul ka object chahiye
      // Isliye $first se first object nikaal rahe hain
      {
        $replaceRoot: {
          newRoot: { $first: "$user" },
        },
      },

      // clerk ID ko final response se hata do
      // Frontend ko iski zarurat nahi hai
      { $project: { clerkId: 0 } },
    ]);

    //conversations ki list frontend ko bhej do
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error.message);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}
export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    let videoUrl;

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res
          .status(500)
          .json({ message: "Media upload is not configured" });
      }

      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
