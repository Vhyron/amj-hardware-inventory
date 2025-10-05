import { Spin } from "antd";
import logo from '@/renderer/src/assets/logo_name.png'

export default function SplashScreen() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				backgroundColor: "#FFF",
			}}
		>
			<div
				style={{
					overflow: "hidden",
					paddingTop: 16,
					paddingBottom: 8,
					marginLeft: 16,
					marginRight: 16,
					display: "flex",
					alignItems: "center",
					gap: 8,
				}}
			>
				<img
					className="flicker-animation"
					src={logo}
					style={{
						objectFit: "contain",
						width: 300,
						height: 300,
					}}
				/>
			</div>
			<Spin size="large" style={{ marginBottom: 16 }} />
		</div>
	);
}
