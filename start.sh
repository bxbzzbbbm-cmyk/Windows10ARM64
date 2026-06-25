#!/data/data/com.termux/files/usr/bin/bash

export HOME="/data/data/com.termux/files/home"

cd ~/base_arm64/khanh 2>/dev/null || {
    echo "Error: Directory ~/base_arm64/khanh not found."
    exit 1
}

echo "Example RAM sizes:"
echo "  512   = 512 MB"
echo "  1024  = 1 GB"
echo "  2048  = 2 GB"
echo "  4096  = 4 GB"
echo

while true; do
    read -p "Enter RAM size in MB (e.g. 2048): " ram

    if [ -z "$ram" ]; then
        echo "RAM size is required."
        continue
    fi

    case "$ram" in
        *[!0-9]*)
            echo "Please enter numbers only."
            ;;
        *)
            [ "$ram" -gt 0 ] && break
            echo "RAM size must be greater than 0."
            ;;
    esac
done

echo "VNC Server: 127.0.0.1:5901"

qemu-system-aarch64 \
-M virt \
-cpu cortex-a53 \
-smp 4 \
--accel tcg,thread=multi \
-m $ram \
-bios BIOS.img \
-device VGA \
-device nec-usb-xhci \
-device usb-kbd \
-device usb-mouse \
-device usb-storage,drive=boot \
-drive if=none,id=boot,file="base_arm64.qcow2" \
-vnc :1
