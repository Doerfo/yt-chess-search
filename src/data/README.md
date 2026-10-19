# Chess video position data

Timestamped chess positions extracted from YouTube videos for the search app.

## Coverage

As of **2026-10-19**:

- **Daniel Naroditsky (Danya):** all videos.

## Files

Each channel has a separate export. The app currently loads
`positions-daniel-naroditsky.json`.

| File | Videos | Position intervals |
| --- | ---: | ---: |
| `positions-daniel-naroditsky.json` | 628 | 263,691 |

Position counts include repeated appearances of the same board placement.

## Format

Each file is a JSON object using schema `yt-chess-search-channel-data/v1`, with
a `channelId` string identifying the YouTube channel and a `videos` array.
Example:

```json
{
  "schemaVersion": "yt-chess-search-channel-data/v1",
  "channelId": "EXAMPLE_CHANNEL_ID",
  "videos": [
    {
      "videoId": "EXAMPLE_VIDEO_ID",
      "videoName": "Example chess video",
      "sourceUrl": "https://www.youtube.com/watch?v=EXAMPLE_VIDEO_ID",
      "uploadDate": "20261019",
      "durationSeconds": 600,
      "positions": [
        {
          "piecePlacement": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
          "timeFromSeconds": 12.5,
          "timeToSeconds": 18.0,
          "boardOrientation": "white_bottom"
        }
      ]
    }
  ]
}
```

Each video includes its YouTube ID, title, URL, and position intervals.
`uploadDate` uses `YYYYMMDD`; `durationSeconds` is the video length in seconds.
Both fields may be omitted or `null` when unknown. A video's `positions` array
may be empty: 5 Daniel Naroditsky videos and 18 Hanging Pawns videos currently
have no extracted positions.

`piecePlacement` is the first field of FEN: eight ranks separated by `/`, with
uppercase letters for White pieces, lowercase letters for Black pieces, and
digits for empty squares. Turn, castling rights, and other FEN fields are not
stored. `timeFromSeconds` and `timeToSeconds` mark an interval in seconds from
the start of the video. `boardOrientation` is `white_bottom`, `black_bottom`, or
`null` when unknown. A position can have multiple intervals in the same video.
