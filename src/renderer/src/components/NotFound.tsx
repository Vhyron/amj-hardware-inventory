import { Button, Typography, Result } from "antd";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
	const navigate = useNavigate();

	return (
		<div style={{ maxWidth: 600, margin: "0 auto" }}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "80vh",
					textAlign: "center",
				}}
			>
				<Result
					status="404"
					title="404"
					subTitle="Sorry, the page you visited does not exist."
					extra={
						<Button
							type="primary"
							onClick={() => navigate("/")}
							style={{ marginTop: 24 }}
						>
							Go to Home
						</Button>
					}
				/>
			</div>
		</div>
	);
}
