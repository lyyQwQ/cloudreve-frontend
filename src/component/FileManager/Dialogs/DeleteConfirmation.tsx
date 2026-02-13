import { Alert, Checkbox, Collapse, DialogContent, FormGroup, Stack, Tooltip } from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Metadata } from "../../../api/explorer.ts";
import { GroupPermission } from "../../../api/user.ts";
import { setFileDeleteModal } from "../../../redux/fileManagerSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { deleteDialogPromisePool } from "../../../redux/thunks/dialog.ts";
import SessionManager from "../../../session";
import { formatDuration } from "../../../util/datetime.ts";
import { SmallFormControlLabel } from "../../Common/StyledComponents.tsx";
import DialogAccordion from "../../Dialogs/DialogAccordion.tsx";
import DraggableDialog, { StyledDialogContentText } from "../../Dialogs/DraggableDialog.tsx";

dayjs.extend(duration);

export interface DeleteOption {
  unlink?: boolean;
  skip_soft_delete?: boolean;
  delete_hls?: boolean;
}
const DeleteConfirmation = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [unlink, setUnlink] = useState(false);
  const [skipSoftDelete, setSkipSoftDelete] = useState(false);
  const [deleteHls, setDeleteHls] = useState(true);

  const open = useAppSelector((state) => state.fileManager[0].deleteFileModalOpen);
  const targets = useAppSelector((state) => state.fileManager[0].deleteFileModalSelected);
  const promiseId = useAppSelector((state) => state.fileManager[0].deleteFileModalPromiseId);
  const loading = useAppSelector((state) => state.fileManager[0].deleteFileModalLoading);

  const hasTrashFiles = useMemo(() => {
    if (targets) {
      return targets.some((target) => target.metadata && target.metadata[Metadata.restore_uri]);
    }

    return false;
  }, [targets]);

  const hasHLSAvailable = useMemo(() => {
    if (!targets) return false;
    return targets.some((target) => target.metadata?.["hls:available"] === "1");
  }, [targets]);

  useEffect(() => {
    if (open && hasHLSAvailable) {
      setDeleteHls(true);
    }
  }, [open, hasHLSAvailable]);

  const onClose = useCallback(() => {
    dispatch(
      setFileDeleteModal({
        index: 0,
        value: [false, targets, undefined, false],
      }),
    );
    if (promiseId) {
      deleteDialogPromisePool[promiseId]?.reject("cancel");
    }
  }, [dispatch, targets, promiseId]);

  const singleFileToTrash = targets && targets.length === 1 && !hasTrashFiles && !skipSoftDelete;
  const multipleFilesToTrash = targets && targets.length > 1 && !hasTrashFiles && !skipSoftDelete;
  const singleFilePermanently = targets && targets.length === 1 && (hasTrashFiles || skipSoftDelete);
  const multipleFilesPermanently = targets && targets.length > 1 && (hasTrashFiles || skipSoftDelete);

  const onAccept = useCallback(() => {
    if (promiseId) {
      deleteDialogPromisePool[promiseId]?.resolve({
        unlink,
        skip_soft_delete: singleFilePermanently || multipleFilesPermanently ? true : skipSoftDelete,
        ...(hasHLSAvailable ? { delete_hls: deleteHls } : {}),
      });
    }
  }, [promiseId, unlink, skipSoftDelete, singleFilePermanently, multipleFilesPermanently, hasHLSAvailable, deleteHls]);

  const permission = SessionManager.currentUserGroupPermission();
  const showSkipSoftDeleteOption = !hasTrashFiles;
  const showUnlinkOption = (skipSoftDelete || hasTrashFiles) && permission.enabled(GroupPermission.advance_delete);
  const showAdvanceOptions = showUnlinkOption || showSkipSoftDeleteOption;

  const group = SessionManager.currentUserGroup();

  return (
    <DraggableDialog
      title={t("application:modals.deleteTitle")}
      showActions
      loading={loading}
      showCancel
      onAccept={onAccept}
      dialogProps={{
        open: open ?? false,
        onClose: onClose,
        fullWidth: true,
        maxWidth: "xs",
      }}
    >
      <DialogContent>
        <Stack spacing={2}>
          <StyledDialogContentText>
            {(singleFileToTrash || singleFilePermanently) && (
              <Trans
                i18nKey={singleFileToTrash ? "modals.deleteOneDescription" : "modals.deleteOneDescriptionHard"}
                ns={"application"}
                values={{
                  name: targets[0].name,
                }}
                components={[<strong key={0} />]}
              />
            )}
            {(multipleFilesToTrash || multipleFilesPermanently) &&
              t(
                multipleFilesToTrash
                  ? "application:modals.deleteMultipleDescription"
                  : "application:modals.deleteMultipleDescriptionHard",
                {
                  num: targets.length,
                },
              )}
            <Collapse in={singleFileToTrash || multipleFilesToTrash}>
              <Alert sx={{ mt: 1 }} severity="info">
                <Trans
                  i18nKey="application:modals.trashRetention"
                  ns={"application"}
                  values={{ num: formatDuration(dayjs.duration((group?.trash_retention ?? 0) * 1000)) }}
                  components={[<strong key={0} />]}
                />
              </Alert>
            </Collapse>
          </StyledDialogContentText>
          <Collapse in={hasHLSAvailable} unmountOnExit>
            <Stack spacing={1} data-testid="delete-hls-prompt">
              <Alert severity="warning">Also delete HLS artifacts for selected video(s)?</Alert>
              <FormGroup>
                <SmallFormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      data-testid="delete-hls-checkbox"
                      onChange={(e) => setDeleteHls(e.target.checked)}
                      checked={deleteHls}
                    />
                  }
                  label={"Delete HLS artifacts"}
                />
              </FormGroup>
            </Stack>
          </Collapse>
          {showAdvanceOptions && (
            <DialogAccordion defaultExpanded={unlink || skipSoftDelete} title={t("application:modals.advanceOptions")}>
              <FormGroup>
                <Collapse in={showSkipSoftDeleteOption}>
                  <Tooltip title={t("application:modals.skipSoftDeleteDes")}>
                    <SmallFormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          onChange={(e) => setSkipSoftDelete(e.target.checked)}
                          checked={skipSoftDelete}
                        />
                      }
                      label={t("application:modals.skipSoftDelete")}
                    />
                  </Tooltip>
                </Collapse>
                <Collapse in={showUnlinkOption}>
                  <Tooltip title={t("application:modals.unlinkOnlyDes")}>
                    <SmallFormControlLabel
                      control={<Checkbox size="small" onChange={(e) => setUnlink(e.target.checked)} checked={unlink} />}
                      label={t("application:modals.unlinkOnly")}
                    />
                  </Tooltip>
                </Collapse>
              </FormGroup>
            </DialogAccordion>
          )}
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};
export default DeleteConfirmation;
