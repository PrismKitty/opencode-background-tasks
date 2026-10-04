{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  name = "opencode-background-tasks-dev";

  packages = [
    pkgs.nodejs_24
    pkgs.pnpm
    pkgs.tmux
    pkgs.asciinema
    pkgs.asciinema-agg
  ];

  # record.sh passes this to agg's --font-dir, so the rendered demo gif uses these fonts
  # instead of whatever happens to be installed on the machine doing the recording
  DEMO_FONT_DIR = "${pkgs.dejavu_fonts}/share/fonts/truetype";

  shellHook = ''
    echo "opencode-background-tasks dev shell ready" >&2
  '';
}
