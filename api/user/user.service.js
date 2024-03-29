const dbService = require('../../services/db.service');
const logger = require('../../services/logger.service');
const reviewService = require('../review/review.service');
const ObjectId = require('mongodb').ObjectId;

module.exports = {
  query,
  getById,
  getByUsername,
  remove,
  update,
  add,
};

async function query(filterBy = {}) {
  const criteria = _buildCriteria(filterBy);
  try {
    const collection = await dbService.getCollection('user');
    var users = await collection.find(criteria).toArray();
    users = users.map((user) => {
      delete user.password;
      user.createdAt = ObjectId(user._id).getTimestamp();
      // Returning fake fresh data
      // user.createdAt = Date.now() - (1000 * 60 * 60 * 24 * 3) // 3 days ago
      return user;
    });
    return users;
  } catch (err) {
    logger.error('cannot find users', err);
    throw err;
  }
}

async function getById(userId) {
  try {
    const collection = await dbService.getCollection('user');
    const user = await collection.findOne({ _id: ObjectId(userId) });
    delete user.password;

    user.givenReviews = await reviewService.query({
      byUserId: ObjectId(user._id),
    });
    user.givenReviews = user.givenReviews.map((review) => {
      delete review.byUser;
      return review;
    });

    return user;
  } catch (err) {
    logger.error(`while finding user ${userId}`, err);
    throw err;
  }
}
async function getByUsername(email) {
  try {
    const collection = await dbService.getCollection('user');
    const user = await collection.findOne({ email });
    return user;
  } catch (err) {
    logger.error(`while finding user ${email}`, err);
    throw err;
  }
}

async function remove(userId) {
  try {
    const collection = await dbService.getCollection('user');
    await collection.deleteOne({ _id: ObjectId(userId) });
  } catch (err) {
    logger.error(`cannot remove user ${userId}`, err);
    throw err;
  }
}

async function update(user) {
  try {
    // peek only updatable fields!
    const userToSave = {
      _id: ObjectId(user._id), // needed for the returnd obj
      username: user.username,
      email: user.email,
      favorite: user.favorite,
      yourPlaylist: user.yourPlaylist,
    };
    const collection = await dbService.getCollection('user');
    await collection.updateOne({ _id: userToSave._id }, { $set: userToSave });
    return userToSave;
  } catch (err) {
    logger.error(`cannot update user ${user._id}`, err);
    throw err;
  }
}

async function add(user) {
  try {
    // peek only updatable fields!
    const userToAdd = {
      username: user.username,
      password: user.password,
      passwordGoogle: user.passwordGoogle,
      email: user.email,
      favorite: {
        playlists: [],
        songs: [],
      },
      yourPlaylist: [],
      // score: 100
    };
    const collection = await dbService.getCollection('user');
    await collection.insertOne(userToAdd);
    return userToAdd;
  } catch (err) {
    logger.error('cannot insert user', err);
    throw err;
  }
}

function _buildCriteria(filterBy) {
  const criteria = {};
  if (filterBy.txt) {
    const txtCriteria = { $regex: filterBy.txt, $options: 'i' };
    criteria.$or = [
      {
        username: txtCriteria,
      },
      {
        fullname: txtCriteria,
      },
    ];
  }
  if (filterBy.minBalance) {
    criteria.balance = { $gte: filterBy.minBalance };
  }
  return criteria;
}
