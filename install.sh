#!/bin/sh
set -e

REPO="abu0306/codegen-cli"

PLATFORM="$(uname | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

if [ "$PLATFORM" = "darwin" ]; then
  if [ "$ARCH" = "arm64" ]; then
    FILE="codegen-macos-arm64"
  else
    FILE="codegen-macos-x64"
  fi
  INSTALL_DIR="/usr/local/bin"
elif [ "$PLATFORM" = "linux" ]; then
  FILE="codegen-linux-x64"
  INSTALL_DIR="/usr/local/bin"
elif echo "$PLATFORM" | grep -qi "mingw"; then
  FILE="codegen-win-x64.exe"
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
else
  echo "Unsupported platform: $PLATFORM"
  exit 1
fi

TAG=$(curl -s https://api.github.com/repos/$REPO/releases/latest | grep tag_name | cut -d '"' -f 4)
URL="https://github.com/$REPO/releases/tag/$TAG/$FILE"

echo "Downloading $FILE from $URL ..."
curl -L -o codegen "$URL"
chmod +x codegen

echo "Installing to $INSTALL_DIR ..."
sudo mv codegen "$INSTALL_DIR/codegen"

# 检查 $INSTALL_DIR 是否在 PATH
case ":$PATH:" in
  *:"$INSTALL_DIR":*)
    echo "$INSTALL_DIR 已在 PATH 中。"
    ;;
  *)
    echo "⚠️  $INSTALL_DIR 不在你的 PATH 中。"
    read -p "是否自动将其添加到你的 shell 配置文件（如 ~/.bashrc 或 ~/.zshrc）？[y/N] " yn
    if [ "$yn" = "y" ] || [ "$yn" = "Y" ] || [ "$yn" = "yes" ] || [ "$yn" = "YES" ]; then
      SHELL_NAME=$(basename "$SHELL")
      if [ "$SHELL_NAME" = "zsh" ]; then
        CONFIG_FILE="$HOME/.zshrc"
      else
        CONFIG_FILE="$HOME/.bashrc"
      fi
      echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$CONFIG_FILE"
      echo "已添加到 $CONFIG_FILE，请重新打开终端或运行 'source $CONFIG_FILE' 使其生效。"
    else
      echo "请手动将 $INSTALL_DIR 添加到你的 PATH。"
    fi
    ;;
esac

echo "安装完成！你现在可以直接运行: codegen"