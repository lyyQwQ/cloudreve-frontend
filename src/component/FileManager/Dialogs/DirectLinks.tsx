import { DialogContent, FormControlLabel, Stack, TextField, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { closeDirectLinkDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import CrUri from "../../../util/uri.ts";
import { StyledCheckbox } from "../../Common/StyledComponents.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";

const DirectLinks = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [showFileName, setShowFileName] = useState(false);
  const [forceDownload, setForceDownload] = useState(false);

  const open = useAppSelector((state) => state.globalState.directLinkDialogOpen);
  const targets = useAppSelector((state) => state.globalState.directLinkRes);

  const contents = useMemo(() => {
    if (!targets) {
      return "";
    }

    return targets
      .map((link) => {
        let finalLink = link.link;

        if (forceDownload) {
          finalLink = finalLink.replace("/f/", "/f/d/");
        }

        if (!showFileName) {
          return finalLink;
        }

        const crUri = new CrUri(link.file_url);
        const elements = crUri.elements();
        return `[${elements.pop()}] ${finalLink}`;
      })
      .join("\n");
  }, [targets, showFileName, forceDownload]);

  const hlsContents = useMemo(() => {
    if (!targets) {
      return "";
    }

    return targets
      .map((link) => {
        if (!link.hls_url) {
          return "";
        }

        if (!showFileName) {
          return link.hls_url;
        }

        const crUri = new CrUri(link.file_url);
        const elements = crUri.elements();
        return `[${elements.pop()}] ${link.hls_url}`;
      })
      .filter((line) => line.length > 0)
      .join("\n");
  }, [targets, showFileName]);

  const onClose = useCallback(() => {
    dispatch(closeDirectLinkDialog());
  }, [dispatch]);

  return (
    <DraggableDialog
      title={t("application:modals.getSourceLinkTitle")}
      showActions
      hideOk
      secondaryAction={
        <Stack direction={isMobile ? "column" : "row"} spacing={1}>
          <FormControlLabel
            sx={{
              ml: 0,
            }}
            slotProps={{
              typography: {
                variant: "body2",
                pl: 1,
                color: "text.secondary",
              },
            }}
            control={
              <StyledCheckbox
                data-testid="direct-links-show-file-name-checkbox"
                onChange={() => {
                  setShowFileName(!showFileName);
                }}
                disableRipple
                checked={showFileName}
                size="small"
              />
            }
            label={t("application:modals.showFileName")}
          />
          <FormControlLabel
            sx={{
              ml: 0,
            }}
            slotProps={{
              typography: {
                variant: "body2",
                pl: 1,
                color: "text.secondary",
              },
            }}
            control={
              <StyledCheckbox
                data-testid="direct-links-force-download-checkbox"
                onChange={() => {
                  setForceDownload(!forceDownload);
                }}
                disableRipple
                checked={forceDownload}
                size="small"
              />
            }
            label={t("application:modals.forceDownload")}
          />
        </Stack>
      }
      dialogProps={{
        open: open ?? false,
        onClose: onClose,
        fullWidth: true,
        maxWidth: "sm",
        PaperProps: {
          "data-testid": "direct-links-dialog-root",
        },
      }}
    >
      <DialogContent sx={{ pt: 2, pb: 0 }}>
        <TextField
          autoFocus
          label={t("modals.sourceLink")}
          multiline
          value={contents}
          variant="outlined"
          fullWidth
          slotProps={{
            htmlInput: {
              readonly: true,
              "data-testid": "direct-links-source-link-text-field",
            },
          }}
        />
        {hlsContents && (
          <TextField
            sx={{ mt: 2 }}
            label={t("application:modals.hlsPlaylistLink")}
            multiline
            value={hlsContents}
            variant="outlined"
            fullWidth
            slotProps={{
              htmlInput: {
                readonly: true,
                "data-testid": "direct-links-hls-link-text-field",
              },
            }}
          />
        )}
      </DialogContent>
    </DraggableDialog>
  );
};
export default DirectLinks;
