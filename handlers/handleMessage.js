const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
var path = require('path');
const pmguard = require('../modules/pmguard');
const config = require('../config')

const handleMessage = async (message, TG_OWNER_ID, tgbot, client) => {
    
    const getMediaInfo = (msg) => {
        switch (msg.type) {
            case 'image': return { fileName: 'image.png', tgFunc: tgbot.telegram.sendPhoto.bind(tgbot.telegram) }; break;
            case 'video': return { fileName: 'video.mp4', tgFunc: tgbot.telegram.sendVideo.bind(tgbot.telegram) }; break;
            case 'audio': return { fileName: 'audio.m4a', tgFunc: tgbot.telegram.sendAudio.bind(tgbot.telegram) }; break;
            case 'ptt': return { fileName: 'voice.ogg', tgFunc: tgbot.telegram.sendVoice.bind(tgbot.telegram) }; break;
            default: return { fileName: msg.body, tgFunc: tgbot.telegram.sendDocument.bind(tgbot.telegram) }; break;
        }
    }

    const chat = await message.getChat();
    const chatName = chat.name || (await client.getChatById(message?.author)).name;
    const contact = await message.getContact();
    let name = contact.name || contact.pushname || message?._data?.notifyName;
    const chatId = message.author || message.from; 
    const contactNumber = chatId.split('@')[0];
    const msgId = message?.id?.id;

    if (message.author == undefined && config.pmguard_enabled == "true") { // Pm check for pmpermit module
        var checkPerm = await pmguard.handlePm(message.from.split("@")[0], name);
        if (checkPerm == "allowed") {

        } else if (checkPerm.action == true && chat.isMuted == false) { // mute 
            message.reply(checkPerm.msg);
            if (config.PMGUARD_ACTION == 'block') { await contact.block() }
            else {
                await chat.mute();
            }
        } else if (chat.isMuted == true) {

        } else if (checkPerm == "error") {

        } else {
            message.reply(checkPerm.msg)
        }

    }

    const tgMessage = `${chat.isGroup ? `${chatName} | <a href="https://wa.me/${contactNumber}?chat_id=${chatId}&message_id=${msgId}">${name}</a>`
        : `<a href="https://wa.me/${contactNumber}?chat_id=${chatId}&message_id=${msgId}"><b>${chatName}</b></a> ${message?.isStatus ? 'Added new status' : ''}`
        }. \n${message.body ? `\n${message.body}` : ""}`;

    if (message.hasMedia && !chat.isMuted) {
        try{
            await message.downloadMedia().then(async (data) => {
                const mediaInfo = await getMediaInfo(message);
                const filePath = path.join( __dirname, '../' + mediaInfo.fileName );
                const messageData = {
                    document: { source: filePath },
                    options: { caption: tgMessage, disable_web_page_preview: true, parse_mode: "HTML" }
                }
                fs.writeFile(mediaInfo.fileName, data.data, "base64", (err) =>
                    err ? console.error(err)
                        : mediaInfo.tgFunc(TG_OWNER_ID, messageData.document, messageData.options).then(
                                () => fs.existsSync(filePath) ?  fs.unlinkSync( filePath ) : null
                        )
                );
            });
        }catch(e){
            console.log(e)
        }
    } else if (!message.from.includes("status") && !chat.isMuted) {
        tgbot.telegram.sendMessage(TG_OWNER_ID, tgMessage,
            { parse_mode: "HTML", disable_web_page_preview: true, disable_notification: chat.isMuted });
    }

}

// const handleMessage = async (message , TG_OWNER_ID , tgbot) => {
//     const sendImg = tgbot.telegram.sendPhoto;
//     sendImg(TG_OWNER_ID, {source: path.join(__dirname, '../code.png')})
// }

module.exports = handleMessage;
