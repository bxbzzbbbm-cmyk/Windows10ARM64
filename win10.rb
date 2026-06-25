#!/usr/bin/env ruby
# win10.rb — launch QEMU for Windows10 ARM64 from Termux
# Sets HOME, changes to the expected directory, prompts for RAM, and execs qemu

ENV['HOME'] = "/data/data/com.termux/files/home"

begin
  Dir.chdir(File.expand_path('~/base_arm64/khanh'))
rescue => e
  # ignore if directory does not exist; qemu may still run from current dir
end

puts "VNC Server: 127.0.0.1:5901"

print "Enter RAM size in MB (e.g., 2048): "
ram = STDIN.gets&.strip
ram = '2048' if ram.nil? || ram.empty?

# Build qemu command as an argument array to avoid shell quoting issues
cmd = [
  'qemu-system-aarch64',
  '-M', 'virt',
  '-cpu', 'cortex-a53',
  '-smp', '4',
  '--accel', 'tcg,thread=multi',
  '-m', ram,
  '-bios', 'BIOS.img',
  '-device', 'VGA',
  '-device', 'nec-usb-xhci',
  '-device', 'usb-kbd',
  '-device', 'usb-mouse',
  '-device', 'usb-storage,drive=boot',
  '-drive', 'if=none,id=boot,file=base_arm64.qcow2',
  '-vnc', ':1'
]

# Replace current process with qemu
exec(*cmd)
