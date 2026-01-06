import { useMemo } from "react";
import { Card, Tag } from "antd";
import { useNavigate } from "react-router-dom";

import excelIcon from "@/assets/icons/excel-icon.png";
import wordIcon from "@/assets/icons/word-icon.png";
import pdfIcon from "@/assets/icons/pdf-icon.png";
import fileIconDefault from "@/assets/icons/file-icon.png";

import "@/assets/css/FileCard.css";

export default function FileCard({ file, size = "large" }) {
  const navigate = useNavigate();

  /* ================= COMPUTED ================= */

  const latestVersion = useMemo(() => {
    return (
      file?.latest_version ||
      file?.versions?.[file.versions.length - 1] ||
      null
    );
  }, [file]);

  const fileType = useMemo(() => {
    return (
      latestVersion?.file_type ||
      file?.file_name?.split(".").pop()?.toLowerCase() ||
      ""
    );
  }, [latestVersion, file]);

  const isImage = useMemo(
    () => ["jpg", "jpeg", "png", "gif", "webp"].includes(fileType),
    [fileType]
  );

  const fileIcon = useMemo(() => {
    switch (fileType) {
      case "doc":
      case "docx":
        return wordIcon;
      case "xls":
      case "xlsx":
        return excelIcon;
      case "pdf":
        return pdfIcon;
      default:
        return fileIconDefault;
    }
  }, [fileType]);

  /* ================= SIZE ================= */

  const imageHeight = useMemo(() => {
    switch (size) {
      case "small":
        return 160;
      case "medium":
        return 200;
      default:
        return 240;
    }
  }, [size]);

  const iconSize = useMemo(() => {
    switch (size) {
      case "small":
        return 64;
      case "medium":
        return 80;
      default:
        return 96;
    }
  }, [size]);

  const cardStyle = useMemo(() => {
    switch (size) {
      case "small":
        return { maxWidth: 200, textAlign: "center", cursor: "pointer" };
      case "medium":
        return { maxWidth: 320, textAlign: "center", cursor: "pointer" };
      default:
        return { maxWidth: 480, textAlign: "center", cursor: "pointer" };
    }
  }, [size]);

  /* ================= ACTION ================= */

  const goToDetail = () => {
    if (!file?.id) return;
    navigate(`/file/${file.id}`);
  };

  /* ================= RENDER ================= */

  return (
    <Card
      hoverable
      className="file-card"
      style={cardStyle}
      bodyStyle={{ padding: 0 }}
      onClick={goToDetail}
    >
      {/* IMAGE */}
      {isImage && latestVersion ? (
        <img
          src={latestVersion.file_url}
          alt="file preview"
          style={{
            width: "100%",
            height: imageHeight,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: imageHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={fileIcon}
            alt="file icon"
            style={{
              width: iconSize,
              height: iconSize,
              objectFit: "contain",
              opacity: 0.7,
            }}
          />
        </div>
      )}

      {/* FOOTER */}
      <div className="file-card-footer">
        {latestVersion?.version_number > 1 && (
          <Tag color="blue">V{latestVersion.version_number}</Tag>
        )}

        <div className="file-name" title={file.file_name}>
          {file.file_name}
        </div>
      </div>
    </Card>
  );
}