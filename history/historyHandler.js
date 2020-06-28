const redis = require('../clients/redisClient');
const logError = require('../clients/loggerClient').logError;

// Volunteer
const getRoomVolunteerKey = (id) => `room:vol:${id}`.toUpperCase()

const getVolunteerRoom = async (volunteer) => {
    const key = getRoomVolunteerKey(volunteer.asssginedUser)
    return await redis.get(key) || {
        createdAt: new Date(),
        volunteerId: volunteer.id,
        history: [{
            action: 'start',
            time: new Date(),
            name: volunteer.name,
            id: volunteer.id,
            type: 'volunteer',
        }]
    }
}

const setRoomVolunteer = async (volunteer, room) => {
    const key = getRoomVolunteerKey(volunteer.asssginedUser)
    return await redis.set(key, room)
}

const addToVolunteer = async (volunteer, message) => {
    if (!volunteer.asssginedUser) {
        logError(`No assgined user for volunteer ${volunteer.id} when trying to save history`)
    }
    let room = await getVolunteerRoom(volunteer)
    room.history.push({
        action: 'message',
        message, 
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'volunteer',
    })
    await setRoomVolunteer(volunteer, room)
}

const setVolunteerEnded = async (volunteer) => {
    let room = await getVolunteerRoom(volunteer)
    room.history.push({
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'user',
        action: 'end',
    })
    await setRoomVolunteer(volunteer, room)
}

// User
const getRoomUserKey = (id) => `room:usr:${id}`.toUpperCase()

const getUserRoom = async (id) => {
    const key = getRoomUserKey(id)
    return await redis.get(key) || {
        createdAt: new Date(),
        userId: id,
        history: [{
            action: 'start',
            time: new Date(),
            name: id,
            id: id,
            type: 'user'
        }]
    }
}

const setRoomUser = async (id, room) => {
    const key = getRoomUserKey(id)
    return await redis.set(key, room)
}

const addToUser = async (userId, message) => {
    let room = await getUserRoom(userId)
    room.history.push({
        action: 'message',
        message, 
        time: new Date(),
        name: userId,
        id: userId,
        type: 'user'
    })
    await setRoomUser(userId, room)
}

const setUserEnded = async (userId) => {
    let room = await getUserRoom(userId)
    room.history.push({
        time: new Date(),
        name: userId,
        id: userId,
        type: 'user',
        action: 'end',
    })
    await setRoomUser(userId, room)
}

// Common
const getConversationHistory= async (userId) => {
    return {
        volunteer: await getVolunteerRoom(userId),
        user: await getUserRoom(userId)
    }
}

const getEnhancedConversationHistory = async(userId) => {
    const rawData = await getConversationHistory(userId)
    const historyArray = rawData.user.history.concat(rawData.volunteer.history)
    const sortedHistoryArray = historyArray.sort((a,b) => new Date(a.time) - new Date(b.time))
    return sortedHistoryArray
}

module.exports = {
    addToUser,
    addToVolunteer,
    setUserEnded,
    setVolunteerEnded,
    getEnhancedConversationHistory,
}