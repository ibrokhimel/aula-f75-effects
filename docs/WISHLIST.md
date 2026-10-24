# Next steps

The shared engine and bridge contract are implemented. See
[KEYBOARD-BRIDGES.md](KEYBOARD-BRIDGES.md) for architecture and adapter work.

- Validate the F75 bridge on real USB-C and 2.4 GHz hardware after the refactor.
- Add a second hardware bridge with a documented live per-key RGB protocol.
- Add bridge registration, device selection, and layout-driven previews to
  the desktop UI so additional adapters can be selected in the app.
- Consider effect layering once the second hardware bridge is proven.

The Windows background host already handles tray operation, global input,
autostart, reconnects, and system audio. Older Linux setup plans are historical.
