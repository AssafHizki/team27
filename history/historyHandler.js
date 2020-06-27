const redis = require('../clients/redisClient');
const logError = require('../clients/loggerClient').logError;

const getRoomKey = (id) => `room:${id}`.toUpperCase()

const getRoom = async (id) => {
    const key = getRoomKey(id)
    return await redis.get(key) || {
        createdAt: new Date(),
        history: []
    }
}

const setRoom = async (id, room) => {
    const key = getRoomKey(id)
    return await redis.set(key, room)
}

const addToUser = async (userId, message) => {
    let room = await getRoom(userId)
    room.history.push({
        message, 
        time: new Date(),
        name: userId,
        id: userId,
        type: 'user'
    })
    await setRoom(userId, room)
}

const addToVolunteer = async (volunteer, message) => {
    if (!volunteer.asssginedUser) {
        logError(`No assgined user for volunteer ${volunteer.id} when trying to save history`)
    }
    let room = await getRoom(volunteer.asssginedUser)
    room.history.push({
        message, 
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'volunteer',
    })
    await setRoom(userId, room)
}

module.exports = {
    addToUser,
    addToVolunteer,
}