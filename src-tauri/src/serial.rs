use serde::{Deserialize, Serialize};
use serialport::SerialPortInfo;

/// 列举可用串口
pub fn list_ports() -> Vec<PortInfo> {
    serialport::available_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|p| PortInfo {
            name: p.port_name.clone(),
            port_type: format_port_type(&p),
        })
        .collect()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub name: String,
    pub port_type: String,
}

fn format_port_type(info: &SerialPortInfo) -> String {
    match &info.port_type {
        serialport::SerialPortType::UsbPort(usb) => {
            format!(
                "USB ({} {})",
                usb.manufacturer.as_deref().unwrap_or(""),
                usb.product.as_deref().unwrap_or("")
            )
            .trim()
            .to_string()
        }
        serialport::SerialPortType::BluetoothPort => "Bluetooth".to_string(),
        serialport::SerialPortType::PciPort => "PCI".to_string(),
        _ => "Unknown".to_string(),
    }
}
