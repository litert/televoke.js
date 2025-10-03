# Televoke RPC Specification V2.1

## Overview

The Televoke protocol describes a united form RPC protocol. It supports functionalities such as handshake negotiation for establishing communication channels, API calls, server message push, binary chunk transmission, heartbeat keep-alive, and of course protocol controls.

The Televoke v2 protocol is an application layer protocol, it must be based on a chunk-transporting protocol, such as Http, [LwDFXv1](https://github.com/litert/lwdfx.js), WebSocket, etc.

> When using Televoke v2 over `LwDFXv1` or `WebSocket`, the ALP identity is `televoke2`.

## News

> Compared to Televoke v2.0, the Televoke v2.1 has the following changes:

- `API_CALL` command

    Introduced `extension` part in the `API_CALL` command request packet, to support the new features in the future.

    In this edition, the `extension` part contains the following features:

    - Argument Encoding

        A field named `args_encoding` is added in the header of `extension` part of the `API_CALL` command request packet, which is an unsigned 32-bit integer. It is used to specify the encoding type of the arguments. The default value is `0`, which means `JSON`.

        With this feature, the client could implement a custom encoding for the arguments, and the server would be able to decode the arguments with the corresponding encoding.

    - Binary Chunks

        A field named `binary_chunk_qty` is added in the header of `extension` header part of the `API_CALL` command request packet, which is an unsigned 32-bit integer. When it is larger than `0`, it means that the request packet contains binary chunks immediately after the `extension` header part. Every binary chunk is a variable-length binary chunk.

        With this feature, the client could send multiple binary chunks in the request body, to solve the problem of sending binary data when the arguments encoding is JSON.

## Compatibility

The Televoke v2.1 protocol is completely compatible with the Televoke v2.0 protocol. All features introduced in the Televoke v2.1 protocol are optional to the Televoke v2.0 implementation.

For best compatibility, the implementation of Televoke v2.x protocol must always read/write the data exactly as the protocol specification, skipping the optional new fields added in the new version.

## Terminology

- Channel

    A channel is a logical communication channel between two parties. It is used to transmit data packets. For example, a channel could be a TCP (LwDFX) connection, or a WebSocket connection, or even a Http request.

- Packet

    A packet is the transport unit of a channel, it's a full function data chunk, can not be split. Each packet includes a header and a body, where the header is a fixed-length binary chunk in all packets, and the body is a variable-length binary chunk in different packets.

    > The packet is not the same as the TCP packet. The packet is a logical unit of the channel, while the TCP packet is a physical unit of the TCP protocol.

- Command

    A command is an instruction from requester to receiver, it's the logical unit of a packet. Each command includes a request packet and a response packet.

- Request

    A request is a packet that contains the instruction of a command. All request packet has the same header in a fixed-length binary format, and the body is different in different commands.

- Response

    A response is a packet that contains the result of a command. All response packet has the same header in a fixed-length binary format, and the body is different in different commands.

## Features

### Multiple Ways of Communication

The channel is a multiple-way communication channel, so the client could send multiple commands at the same time, don't need to wait for the result of the previous command before sending the next one. The receiver could also response each command request in any order.

### API Calls

The client could invoke an API on the server. The server will execute the API and return the result to the client.

The arguments and the result is not restricted to a determined data format, but JSON is recommended. However, API calls should only be used for small data transmission, not for large data transmission. If there is a need to transmit large data, it is recommended to use binary chunk transmission.

### Server Message Push

The server could push a message to the client. It's useful when the server wants to notify the client of something.

As the API calls do, the message is not restricted to a determined data format, but JSON is still recommended. And, server message push should be used for small data transmission only too.

### Binary Chunk Transmission

When there is a large amount of data to be transmitted from one side to the other side, the binary chunk transmission will be the better choice. This feature allows the sender to divide a large data into smaller data chunks, and transmit them to the receiver in fragments. This approach reduces the time of chunking the channel, so that the other packets could still enjoy the benefits from multiple-way transmission. Additionally, if needed, this feature can be leveraged to implement resumable transfers, enabling the ability to resume transmission from where it left off in case of interruptions.

To start a binary chunk transmission, the receiver must open a binary chunk stream first, and give the stream identity to the sender. Then the sender could send binary chunk packets to the receiver, with the stream identity. After all the binary chunk packets are sent, the sender must close the binary chunk stream, by sending a zero-length binary chunk packet with the stream identity.

There is no protocol-level control of opening and submitting binary chunk streams. The sender and receiver could use API calls or push message to negotiate the stream identity.

### Heartbeat Keep-Alive

The one side could send `PING` packets to the other side, to ensure the channel is alive, and keep the channel alive.

### Gracefully Shutdown

The one side could send a `CLOSE` packet to the other side to gracefully shutdown the channel. When a `CLOSE` packet is sent out, both the sender and receiver must stop sending any request packets, and wait for all the received commands to be responded. After all the other response packets are sent, the receiver must reply a `CLOSE` response packet to the sender. Finally, both side close the channel. The sender must wait for the `CLOSE` response packet to be received, and then close the channel.

## Packets

First of all, the packet is a binary chunk, which is composed of a header and a body payload, where the header is a fixed-length binary chunk and the body is a variable-length binary chunk. **All data fields are in the little-endian format**.

All data structure below are described in C language, but there is no memory alignment required in the Televoke protocol. So these structure are always compacted, which means **these data structure are actually aligned to 1 byte**.

### Packet Header

The header of command packet is a binary chunk in a fixed format.

```c
struct Tv2PacketHeader {
    uint8_t     cCommand;
    uint8_t     cType;
    uint16_t    wSequenceHigh;
    uint32_t    dwSequenceLow;
};
```

Here are the explanations of the fields:

- `cCommand`

    The command type. It is a 8-bit unsigned integer.

- `cType`

    The type of packet. It is a 8-bit unsigned integer. It is used to indicate whether the packet is a request or a response.

    Following types are defined:

    - `0x00` - Request

        The packet is a request packet.

    - `0x01` - Successful Response

        The packet is a successful response packet.

    - `0x02` - Error Response

        The packet is an error response packet.

- `wSequenceHigh`

    The high 16-bit of the command sequence number.

    The command sequence is a 48-bit unsigned integer. It must not repeat in a stream.

    In a response packet, the sequence number must be the same as it is in the request packet.

- `dwSequenceLow`

    The low 32-bit of the command sequence number.

The rest of the packet after the header is the body of the command request or response. It is a variable-length binary chunk, depends on the command type.

### Command Failure Response

When a command failed, the packet body is the error message encoded in UTF-8.

```c
typedef struct {

    /**
     * The byte-length of content.
     */
    uint16_t    wByteLength;

    uint8_t     content[];

} var_binary16_t, var_string_t; // when var_string_t is used, the content must be a valid UTF-8 string.

struct Tv2CommandErrorResponsePacket {

    struct Tv2PacketHeader  header;

    var_string_t            sError;
};
```

If it's an error in the RPC level, the error message is always in format of `tv_error: <err_code>`.

e.g.

- `tv_error: api_not_found`

    The called API is not found.

- `tv_error: cmd_not_impl`
    
    The command is not implemented.

- `tv_error: chunk_stream_not_found`

    The binary chunk stream is not found.

- `tv_error: msg_drop`

    The message is dropped because no message listener is registered.

- `tv_error: sys_busy`

    The system is busy, the command is not executed.

- `tv_error: shutdown`

    The channel is shutting down.

## Commands

### Command: API Invoke

The request packet of command `API_CALL` use code `0x00`, it is used to invoke an API.

#### Request Packet

```c
typedef struct {

    /**
     * The byte-length of content.
     */
    uint32_t    dwByteLength;

    uint8_t     content[];

} var_binary32_t;

typedef struct {

    uint32_t                dwHeaderLength;

    uint32_t                dwArgsEncoding;

    uint32_t                dwBinaryChunkQty;

    uint8_t                 aTailingHeader[];

} tv2p1_api_req_ext_header_t;

typedef struct {

    tv2p1_api_req_ext_header_t  header;

    var_binary32_t               sBinaryChunkList[];

} tv21_api_call_ext_t;

struct Tv2ApiInvokeCommandRequestPacket {

    struct Tv2PacketHeader  header;

    var_string_t            sApiName;

    var_binary32_t          aArguments;

    tv21_api_call_ext_t     tv21ext;
};
```

Here are the explanations of the fields:

- `sApiName`

    The name of the API to invoke. It is a variable-length string.

- `sArguments`

    The arguments of the API. It is a variable-length binary chunk.

- `tv21ext`

    This is an extension part added in the Televoke v2.1 protocol. It is optional for the Televoke v2.0 protocol implementation. When decoding the `tv21ext` part, **must consider the possibility that the `tv21ext` part may not present in the request packet.**

    The extension part contains two parts:

    - `tv21ext.header` Extension Header

        This is a variable-length binary chunk contains multiple fields.
        
        - `tv21ext.header.dwHeaderLength`

            The first 4 bytes is a 32-bit unsigned integer, which is the length of the extension header. For every new field introduced in the future must be added to the end of the extension header.

        - `tv21ext.header.dwArgsEncoding`

            The encoding type of the arguments. It is a 32-bit unsigned integer. The default value is `0`, which means `JSON`.

        - `tv21ext.header.dwBinaryChunkQty`

            Televoke/2.1 introduced the binary chunks in the `API_CALL` request packet. The `API_CALL` command request packet could contain multiple binary chunks in the body, and the `dwBinaryChunkQty` field is used to indicate the number of binary chunks in the request packet.

        After decoding the known fields, there may be some new added fields in the future, for the compatibilities, **the decoder must skip the rest of the unrecognizable bytes at the end of the extension header**.

    - `tv21ext.sBinaryChunkList`

        The `sBinaryChunkList` is an array of binary chunks, each chunk is a `var_binary32_t` type data. The `tv21ext.header.dwBinaryChunkQty` field indicates the number of binary chunks in the array.

#### Response Packet

```c
typedef struct {

    uint32_t                dwHeaderLength;

    uint32_t                dwBinaryChunkQty;

    uint8_t                 aTailingHeader[];

} tv2p1_api_resp_ext_header_t;

typedef struct {

    tv2p1_api_resp_ext_header_t  header;

    var_binary32_t               sBinaryChunkList[];

} tv21_api_call_ext_t;

struct Tv2ApiInvokeCommandResponsePacket {

    struct Tv2PacketHeader          header;

    var_binary32_t                  aResult;

    tv2p1_api_resp_ext_header_t     tv21ext;
};
```

Here are the explanations of the fields:

- `sResult`

    The result of the API. It is a variable-length binary chunk.

- `tv21ext`

    This is an extension part added in the Televoke v2.1 protocol. It is optional for the Televoke v2.0 protocol implementation. When decoding the `tv21ext` part, **must consider the possibility that the `tv21ext` part may not present in the response packet.**

    The extension part contains two parts:

    - `tv21ext.header` Extension Header

        - `tv21ext.header.dwHeaderLength`

            The first 4 bytes is a 32-bit unsigned integer, which is the length of the extension header. For every new field introduced in the future must be added to the end of the extension header.

        - `tv21ext.header.dwBinaryChunkQty`

            Televoke/2.1 introduced the binary chunks in the `API_CALL` response packet. The `API_CALL` command response packet could contain multiple binary chunks in the body, and the `dwBinaryChunkQty` field is used to indicate the number of binary chunks in the response packet.

        After decoding the known fields, there may be some new added fields in the future, for the compatibilities, **the decoder must skip the rest of the unrecognizable bytes at the end of the extension header**.

    - `tv21ext.sBinaryChunkList`

        The `sBinaryChunkList` is an array of binary chunks, each chunk is a `var_binary32_t` type data. The `tv21ext.header.dwBinaryChunkQty` field indicates the number of binary chunks in the array.

### Command: Push Message

The request packet of command `PUSH_MESSAGE` use code `0x01`, it is used to push a message from server side to the client side.

#### Request Packet

```c
struct Tv2PushMessageCommandRequestPacket {

    struct Tv2PacketHeader  header;

    var_binary32_t          aMessage;
};
```

Here are the explanations of the fields:

- `aMessage`

    The body of the message. It is a variable-length binary chunk.

#### Response Packet

```c
struct Tv2PushMessageCommandResponsePacket {

    struct Tv2PacketHeader header;
};
```

The response of push message command has no extra body.

### Command: Binary Chunk

The request packet of command `BINARY_CHUNK` use code `0x02`, it is used to send a binary chunk to the other side.

#### Request Packet

```c
struct Tv2BinaryChunkCommandRequestPacket {

    struct Tv2PacketHeader  header;

    uint32_t            dwStreamId;
    uint32_t            dwChunkIndex;
    var_binary32_t      aChunkData;
};
```

Here are the explanations of the fields:

- `dwStreamId`

    The stream identity of the binary chunk. It is a 32-bit integer.

- `dwChunkIndex`

    The index of the binary chunk. It is a 32-bit integer, starts from 0.

    The receiver would expect `0` as the first chunk index, and then 1, 2, 3, one by one, in sequence.

    > Sending `0xFFFFFFFF` means aborting the stream by the sender, and the receiver should drop the stream.

- `aChunkData`

    The body of the binary chunk. It is a variable-length binary chunk.

    If a zero-length binary chunk is received, it means all the binary chunks are sent, and the stream is completed.

#### Response Packet

```c
struct Tv2BinaryChunkCommandResponsePacket {

    struct Tv2PacketHeader  header;
};
```

### Command: Ping

The request packet of command `PING` use code `0xFE`, it is used to test the connection between the client and the server.

#### Request Packet

```c
struct Tv2PingCommandRequestPacket {

    struct Tv2PacketHeader header;

    var_binary16_t aMessage;
};
```

Here are the explanations of the fields:

- `aMessage`

    The message of the ping command. It is a variable-length UTF-8 string.

#### Response Packet

```c
struct Tv2PingCommandResponsePacket {

    struct Tv2PacketHeader  header;

    var_binary16_t          aMessage;
};
```

Here are the explanations of the fields:

- `sMessage`

    The message of the ping command. It is a variable-length UTF-8 string. It must be the same as the request.

### Command: Close

The request packet of command `CLOSE` use code `0xFF`. It is used to notify the other side that the stream is going to close, which means that only command response could be sent and received after this command over current channel.

#### Request Packet

```c
struct Tv2CloseCommandRequestPacket {

    struct Tv2PacketHeader header;
};
```

The `close` command has no extra body.

When the sender sends out the `CLOSE` command, it should reject any further command request with error response `tv_error: shutdown`.

#### Response Packet

```c
struct Tv2CloseCommandResponsePacket {

    struct Tv2PacketHeader header;
};
```

The `close` command has no extra body.

When the sender receives the close command response, it should close the channel completely.
