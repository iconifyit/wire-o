import fetch from "node-fetch";

/**
 * Gets a promise to a file buffer from URL.
 * @param url
 * @returns {Promise<*>}
 */
const getFileBuffer = async (url) => {
    const res = await fetch(url, {
        redirect : 'follow',
        encoding : null
    })
    return await res.buffer();
}

export default getFileBuffer;
