const redis = require('../clients/redisClient');
const logError = require('../clients/loggerClient').logError;

// Volunteer
const getRoomVolunteerKey = (id) => `room:vol:${id}`.toUpperCase()

const getVolunteerRoom = async (asssginedUserId, volunteerId='') => {
    const key = getRoomVolunteerKey(asssginedUserId)
    return await redis.get(key) || {
        createdAt: new Date(),
        volunteerId: volunteerId,
        history: []
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
    let room = await getVolunteerRoom(volunteer.asssginedUser, volunteer.id)
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
    let room = await getVolunteerRoom(volunteer.asssginedUser, volunteer.id)
    room.history.push({
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'volunteer',
        action: 'end',
    })
    await setRoomVolunteer(volunteer, room)
}

const setVolunteerStarted = async (volunteer) => {
    let room = await getVolunteerRoom(volunteer.asssginedUser, volunteer.id)
    room.history.push({
        time: new Date(),
        name: volunteer.name,
        id: volunteer.id,
        type: 'volunteer',
        action: 'start',
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
        history: []
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

const setUserStarted = async (userId) => {
    let room = await getUserRoom(userId)
    room.history.push({
        time: new Date(),
        name: userId,
        id: userId,
        type: 'user',
        action: 'start',
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

const mapHistoryEvent = (event) => {
    try {
        if (event.action === 'start') {
            return `[${event.time}] Coversation started by user id ${event.id}`
        }
        if (event.action === 'message') {
            return `[${event.time}] ${event.name}: ${event.message}`
        }
        if (event.action === 'end') {
            return `[${event.time}] Coversation ended by ${event.name}`
        }
    } catch (error) {
        logError(`Failed to map event: ${JSON.stringify(event)}. Error:${error}`)
    }
}

const getEnhancedConversationHistory = async(userId) => {
    const rawData = await getConversationHistory(userId)
    const historyArray = rawData.user.history.concat(rawData.volunteer.history)
    const sortedHistoryArray = historyArray.sort((a,b) => new Date(a.time) - new Date(b.time))
    return sortedHistoryArray.map(mapHistoryEvent).join('\n')
}

module.exports = {
    addToUser,
    addToVolunteer,
    setUserEnded,
    setVolunteerEnded,
    setUserStarted,
    setVolunteerStarted,
    getEnhancedConversationHistory,
}