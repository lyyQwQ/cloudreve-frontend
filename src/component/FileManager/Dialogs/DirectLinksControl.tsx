import {
  Alert,
  Box,
  DialogContent,
  FormControlLabel,
  IconButton,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFileInfo, sendDeleteDirectLink } from "../../../api/api.ts";
import { DirectLink, FileResponse } from "../../../api/explorer.ts";
import { closeDirectLinkManagementDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { confirmOperation } from "../../../redux/thunks/dialog.ts";
import { copyToClipboard } from "../../../util/index.ts";
import AutoHeight from "../../Common/AutoHeight.tsx";
import { NoWrapTableCell, StyledCheckbox, StyledTableContainerPaper } from "../../Common/StyledComponents.tsx";
import TimeBadge from "../../Common/TimeBadge.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import CopyOutlined from "../../Icons/CopyOutlined.tsx";
import DeleteOutlined from "../../Icons/DeleteOutlined.tsx";

const DirectLinksControl = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [fileExtended, setFileExtended] = useState<FileResponse | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [forceDownload, setForceDownload] = useState(false);

  const open = useAppSelector((state) => state.globalState.directLinkManagementDialogOpen);
  const target = useAppSelector((state) => state.globalState.directLinkManagementDialogFile);
  const highlight = useAppSelector((state) => state.globalState.directLinkHighlight);
  const extendedInfo = fileExtended?.extended_info;
  const directLinksFromFile = extendedInfo?.direct_links;

  const hilightButNotFound = useMemo(() => {
    return highlight && extendedInfo && !directLinksFromFile?.some((link) => String(link.id) === String(highlight));
  }, [highlight, extendedInfo, directLinksFromFile]);

  const onClose = useCallback(() => {
    if (!loading) {
      dispatch(closeDirectLinkManagementDialog());
    }
  }, [dispatch, loading]);

  useEffect(() => {
    if (target && open) {
      setFileExtended(undefined);
      dispatch(
        getFileInfo({
          uri: target.path,
          extended: true,
        }),
      )
        .then((res) => setFileExtended(res))
        .catch(() => undefined);
    }
  }, [target, open, dispatch]);

  const directLinks = useMemo(() => {
    return directLinksFromFile?.map((link) => {
      return {
        ...link,
        url: forceDownload ? link.url.replace("/f/", "/f/d/") : link.url,
      };
    });
  }, [directLinksFromFile, forceDownload]);

  const handleRowClick = useCallback((directLink: DirectLink) => {
    window.open(directLink.url, "_blank");
  }, []);

  const copyURL = useCallback((actionTarget: DirectLink) => {
    if (!actionTarget) {
      return;
    }

    copyToClipboard(actionTarget.url);
  }, []);

  const deleteDirectLink = useCallback(
    (actionTarget: DirectLink) => {
      if (!target || !actionTarget) {
        return;
      }

      dispatch(confirmOperation(t("fileManager.deleteLinkConfirm")))
        .then(() => {
          setLoading(true);
          dispatch(sendDeleteDirectLink(actionTarget.id))
            .then(() => {
              setFileExtended((prev) =>
                prev
                  ? {
                      ...prev,
                      extended_info: prev.extended_info
                        ? {
                            ...prev.extended_info,
                            direct_links: prev.extended_info.direct_links?.filter(
                              (link) => link.id !== actionTarget.id,
                            ),
                          }
                        : undefined,
                    }
                  : undefined,
              );
            })
            .catch(() => undefined)
            .finally(() => {
              setLoading(false);
            });
        })
        .catch(() => undefined);
    },
    [t, target, dispatch],
  );

  return (
    <DraggableDialog
      title={t("application:fileManager.manageDirectLinks")}
      loading={loading}
      dialogProps={{
        open: open ?? false,
        onClose: onClose,
        fullWidth: true,
        maxWidth: "md",
      }}
    >
      <DialogContent>
        <AutoHeight>
          {hilightButNotFound && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("application:fileManager.directLinkNotFound")}
            </Alert>
          )}
          <TableContainer component={StyledTableContainerPaper} data-testid="direct-links-control-table-wrapper">
            <Table sx={{ width: "100%" }} size="small">
              <TableHead>
                <TableRow>
                  <NoWrapTableCell>{t("fileManager.actions")}</NoWrapTableCell>
                  <TableCell>{t("modals.sourceLink")}</TableCell>
                  <NoWrapTableCell>{t("setting.viewNumber")}</NoWrapTableCell>
                  <NoWrapTableCell>{t("fileManager.createdAt")}</NoWrapTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!fileExtended && (
                  <TableRow
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <NoWrapTableCell component="th" scope="row">
                      <Skeleton variant={"text"} width={100} />
                    </NoWrapTableCell>
                    <TableCell>
                      <Skeleton variant={"text"} width={200} />
                    </TableCell>
                    <NoWrapTableCell>
                      <Skeleton variant={"text"} width={60} />
                    </NoWrapTableCell>
                    <NoWrapTableCell>
                      <Skeleton variant={"text"} width={100} />
                    </NoWrapTableCell>
                  </TableRow>
                )}
                {directLinks &&
                  directLinks.map((link) => {
                    const isHighlighted = highlight && String(highlight) === String(link.id);

                    return (
                      <TableRow
                        key={link.id}
                        hover
                        selected={Boolean(isHighlighted)}
                        data-testid={`direct-links-control-row-container-${link.id}`}
                        sx={{
                          boxShadow: (theme) =>
                            isHighlighted ? `inset 0 0 0 2px ${theme.palette.primary.light}` : "none",
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <NoWrapTableCell component="th" scope="row">
                          <IconButton
                            onClick={() => copyURL(link)}
                            size={"small"}
                            data-testid={`direct-links-control-row-copy-button-${link.id}`}
                          >
                            <CopyOutlined fontSize={"small"} />
                          </IconButton>
                          <IconButton
                            disabled={loading}
                            onClick={() => deleteDirectLink(link)}
                            size={"small"}
                            data-testid={`direct-links-control-row-delete-button-${link.id}`}
                          >
                            <DeleteOutlined fontSize={"small"} />
                          </IconButton>
                        </NoWrapTableCell>
                        <TableCell
                          sx={{
                            maxWidth: 300,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Typography variant="body2" sx={{ cursor: "text" }}>
                            <Link
                              href={link.url}
                              target="_blank"
                              underline="hover"
                              data-testid={`direct-links-control-row-link-anchor-${link.id}`}
                            >
                              {link.url}
                            </Link>
                          </Typography>
                        </TableCell>
                        <NoWrapTableCell>{link.downloaded}</NoWrapTableCell>
                        <NoWrapTableCell>
                          <TimeBadge variant={"body2"} datetime={link.created_at} />
                        </NoWrapTableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            {!directLinks && fileExtended && (
              <Box sx={{ p: 1, width: "100%", textAlign: "center" }}>
                <Typography variant={"caption"} color={"text.secondary"}>
                  {t("application:setting.listEmpty")}
                </Typography>
              </Box>
            )}
          </TableContainer>
        </AutoHeight>
        <FormControlLabel
          sx={{
            ml: 0,
            mt: 2,
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
              onChange={() => {
                setForceDownload(!forceDownload);
              }}
              disableRipple
              checked={forceDownload}
              size="small"
              data-testid="direct-links-control-force-download-checkbox"
            />
          }
          label={t("application:modals.forceDownload")}
        />
      </DialogContent>
    </DraggableDialog>
  );
};

export default DirectLinksControl;
