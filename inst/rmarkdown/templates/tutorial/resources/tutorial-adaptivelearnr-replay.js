// Session replay functions for adaptivelearnr javascript code.

/**
 * Global variables and constants
 */

var replay_chunk_i = 0;  // current replay chunk index
var replay_n_chunks = null;  // index of the last replay chunk
var replay_chunks = {};  // object that maps replay chunk indices to chunk data for all chunks
                         // that were not completely played, yet
var replay_start_on_first_chunk = false;   // if true, start playback when first chunk is received


/**
 * Callback function when replay of a chunk has ended.
 */
function replayChunkEnd() {
    // remove chunk data that was just played
    delete replay_chunks[replay_chunk_i];

    if (replay_chunk_i >= replay_n_chunks - 1) {
        console.log("no more replay chunks to play");
        replayStop();
        return;
    }

    // get chunk data for the current replay chunk index
    replay_chunk_i++;
    console.log("continue playing with chunk index ", replay_chunk_i);
    replaydata = replay_chunks[replay_chunk_i];

    // set the new chunk data and continue playing
    //window.resizeTo(replaydata.window.width, replaydata.window.height);
    mus.setFrames(replaydata.frames);
    mus.setWindowSize(replaydata.window.width, replaydata.window.height);
    mus.play(replayChunkEnd);

    if (replay_chunk_i < replay_n_chunks - 1) {
        // request next chunk
        console.log("requesting replay chunk data with index ", replay_chunk_i + 1);
        messageToParentWindow("pulldata", {"i": replay_chunk_i + 1});
    } else {
        console.log("no more replay chunks to request");
    }
}


/**
 * Playback for session replay has stopped – reset states.
 */
function replayStop() {
    mus.stop();
    mus.release();
    replay_chunks = {};
    replay_chunk_i = 0;
    replay_start_on_first_chunk = false;

    // inform the parent window
    messageToParentWindow("replay_stopped");
}


/**
 * Event handler for receiving events from the parent frame in session replay mode.
 */
function replayMessageReceived(event) {
    console.log("message from parent frame:", event);

    if (!event.isTrusted || event.origin !== apiserver_url.origin) return

    if (event.data.msgtype === "app_config") {
        prepareSession(sess, event.data.data);
        mus = new Mus();
    } else if (event.data.msgtype === "replaydata") {
        let replay_i = event.data.data.i;
        let replaydata = event.data.data.replaydata;

        replay_chunks[replay_i] = replaydata;

        if (replay_i === 0) {
            console.log("received first replay chunk");
            replay_n_chunks = event.data.data.n_chunks;
            console.log("number of replay chunks is ", replay_n_chunks);
            replay_chunk_i = 0;

            //window.resizeTo(replaydata.window.width, replaydata.window.height);
            mus.setFrames(replaydata.frames);
            mus.setWindowSize(replaydata.window.width, replaydata.window.height);

            if (replay_start_on_first_chunk) {
                mus.play();
                replay_start_on_first_chunk = false;
            }

            if (replay_n_chunks > 1) {
                console.log("requesting replay chunk data with index ", 1);
                messageToParentWindow("pulldata", {"i": 1});
            }
        }
    } else if (event.data.msgtype === "replay_ctrl_play") {
        if ($.isEmptyObject(replay_chunks)) {
            messageToParentWindow("pulldata", {"i": 0});
            replay_start_on_first_chunk = true;
        } else {
            mus.play(replayChunkEnd);
        }
    } else if (event.data.msgtype === "replay_ctrl_pause") {
        mus.pause(replayChunkEnd);
    } else if (event.data.msgtype === "replay_ctrl_stop") {
        replayStop();
    } else {
        console.error("event message type not understood:", event.data.msgtype);
    }
}
