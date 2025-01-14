import { rgba } from 'polished'
import React, { useEffect, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import { useSpring } from 'react-spring/native'

import {
  AddColumnDetailsPayload,
  ColumnSubscription,
  constants,
  GitHubIcon,
} from '@devhub/core'
import { useHover } from '../../hooks/use-hover'
import { useReduxAction } from '../../hooks/use-redux-action'
import { useReduxState } from '../../hooks/use-redux-state'
import { Platform } from '../../libs/platform'
import * as actions from '../../redux/actions'
import * as selectors from '../../redux/selectors'
import { sharedStyles } from '../../styles/shared'
import { contentPadding, radius } from '../../styles/variables'
import { getDefaultReactSpringAnimationConfig } from '../../utils/helpers/animations'
import { getGitHubAppInstallUri } from '../../utils/helpers/shared'
import { SpringAnimatedTouchableOpacity } from '../animated/spring/SpringAnimatedTouchableOpacity'
import { ColumnHeaderItem } from '../columns/ColumnHeaderItem'
import { ModalColumn } from '../columns/ModalColumn'
import { fabSize } from '../common/FAB'
import { H2 } from '../common/H2'
import { HeaderMessage } from '../common/HeaderMessage'
import { Link } from '../common/Link'
import { separatorThickSize } from '../common/Separator'
import { Spacer } from '../common/Spacer'
import { SubHeader } from '../common/SubHeader'
import { useColumnWidth } from '../context/ColumnWidthContext'
import { useAppLayout } from '../context/LayoutContext'
import { useTheme } from '../context/ThemeContext'
import { fabSpacing, shouldRenderFAB } from '../layout/FABRenderer'
import { ThemedText } from '../themed/ThemedText'

export interface AddColumnModalProps {
  showBackButton: boolean
}

const columnTypes: Array<{
  title: string
  type: ColumnSubscription['type']
  icon: GitHubIcon
  items: Array<{
    title: string
    icon: GitHubIcon
    payload: AddColumnDetailsPayload | null
  }>
  soon?: boolean
  soonLink?: string
}> = [
  {
    title: 'Notifications',
    type: 'notifications',
    icon: 'bell',
    items: [
      {
        title: 'Notifications',
        icon: 'bell',
        payload: {
          icon: 'bell',
          title: 'All notifications',
          subscription: {
            type: 'notifications',
            subtype: undefined,
          },
          paramList: ['all'],
          isPrivateSupported: true,
        },
      },
      {
        title: 'Repository',
        icon: 'repo',
        payload: {
          icon: 'bell',
          title: 'Repository notifications',
          subscription: {
            type: 'notifications',
            subtype: 'REPO_NOTIFICATIONS',
          },
          paramList: ['all', 'owner', 'repo'],
          isPrivateSupported: true,
        },
      },
    ],
  },
  {
    title: 'Issues & Pull Requests',
    type: 'issue_or_pr',
    icon: 'issue-opened',
    items: [
      {
        title: 'Issues',
        icon: 'issue-opened',
        payload: {
          icon: 'issue-opened',
          title: 'Issues',
          subscription: {
            type: 'issue_or_pr',
            subtype: 'ISSUES',
          },
          paramList: ['owner', 'repo'],
          isPrivateSupported: true,
        },
      },
      {
        title: 'Pull Requests',
        icon: 'git-pull-request',
        payload: {
          icon: 'git-pull-request',
          title: 'Pull Requests',
          subscription: {
            type: 'issue_or_pr',
            subtype: 'PULLS',
          },
          paramList: ['owner', 'repo'],
          isPrivateSupported: true,
        },
      },
    ],
  },
  {
    title: 'Activities',
    type: 'activity',
    icon: 'note',
    items: [
      {
        title: 'Dashboard',
        icon: 'home',
        payload: {
          icon: 'home',
          title: 'User dashboard',
          subscription: {
            type: 'activity',
            subtype: 'USER_RECEIVED_EVENTS',
          },
          paramList: ['username'],
          isPrivateSupported: false,
          defaultFilters: {
            subjectTypes: {
              Release: true,
              Repository: true,
              Tag: true,
              User: true,
            },
          },
        },
      },
      {
        title: 'User',
        icon: 'person',
        payload: {
          icon: 'person',
          title: 'User activity',
          subscription: {
            type: 'activity',
            subtype: 'USER_EVENTS',
          },
          paramList: ['username'],
          isPrivateSupported: false,
        },
      },
      {
        title: 'Repository',
        icon: 'repo',
        payload: {
          icon: 'repo',
          title: 'Repository activity',
          subscription: {
            type: 'activity',
            subtype: 'REPO_EVENTS',
          },
          paramList: ['owner', 'repo'],
          isPrivateSupported: false, // https://github.com/devhubapp/devhub/issues/140
        },
      },
      {
        title: 'Organization',
        icon: 'organization',
        payload: {
          icon: 'organization',
          title: 'Organization activity',
          subscription: {
            type: 'activity',
            subtype: 'ORG_PUBLIC_EVENTS',
          },
          paramList: ['org'],
          isPrivateSupported: false,
        },
      },
    ],
  },
]

function AddColumnModalItem({
  availableWidth,
  disabled,
  icon,
  payload,
  title,
}: {
  availableWidth: number
  disabled?: boolean
  icon: GitHubIcon
  payload: AddColumnDetailsPayload | null
  title: string
}) {
  const initialTheme = useTheme(undefined, theme => {
    if (cacheRef.current.theme === theme) return
    cacheRef.current.theme = theme
    updateStyles()
  })

  const touchableRef = useRef(null)
  const initialIsHovered = useHover(touchableRef, isHovered => {
    cacheRef.current.isHovered = isHovered
    updateStyles()
  })

  const cacheRef = useRef({
    isHovered: initialIsHovered,
    isPressing: false,
    theme: initialTheme,
  })
  cacheRef.current.theme = initialTheme

  const [springAnimatedStyles, setSpringAnimatedStyles] = useSpring(getStyles)

  useEffect(() => {
    updateStyles()
  }, [disabled])

  const pushModal = useReduxAction(actions.pushModal)

  function getStyles() {
    const { isHovered, isPressing, theme } = cacheRef.current
    const immediate = constants.DISABLE_ANIMATIONS || isHovered

    return {
      config: getDefaultReactSpringAnimationConfig(),
      immediate,
      backgroundColor:
        (isHovered || isPressing) && !disabled
          ? theme.backgroundColorLess2
          : rgba(theme.backgroundColor, 0),
      borderColor: theme.backgroundColorLess2,
    }
  }

  function updateStyles() {
    setSpringAnimatedStyles(getStyles())
  }

  if (!(availableWidth > 0)) return null

  return (
    <SpringAnimatedTouchableOpacity
      ref={touchableRef}
      analyticsLabel={undefined}
      disabled={disabled || !payload}
      onPress={
        payload
          ? () =>
              pushModal({
                name: 'ADD_COLUMN_DETAILS',
                params: payload,
              })
          : undefined
      }
      onPressIn={() => {
        if (Platform.realOS === 'web') return

        cacheRef.current.isPressing = true
        updateStyles()
      }}
      onPressOut={() => {
        if (Platform.realOS === 'web') return

        cacheRef.current.isPressing = false
        updateStyles()
      }}
      style={{
        width:
          availableWidth / Math.floor(availableWidth / (82 + contentPadding)),
        borderRadius: radius,
        borderWidth: 0,
        ...springAnimatedStyles,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: contentPadding / 4,
          paddingVertical: contentPadding,
        }}
      >
        <ColumnHeaderItem
          analyticsLabel={undefined}
          iconName={icon}
          iconStyle={{ lineHeight: undefined }}
          noPadding
          size={24}
          style={{ alignSelf: 'center', marginBottom: contentPadding / 2 }}
          tooltip={undefined}
        />

        <ThemedText color="foregroundColor" style={{ textAlign: 'center' }}>
          {title}
        </ThemedText>
      </View>
    </SpringAnimatedTouchableOpacity>
  )
}

export function AddColumnModal(props: AddColumnModalProps) {
  const { showBackButton } = props

  const columnIds = useReduxState(selectors.columnIdsSelector)
  const username = useReduxState(selectors.currentGitHubUsernameSelector)
  const installationOwnerNames = useReduxState(
    selectors.installationOwnerNamesSelector,
  )

  const columnWidth = useColumnWidth()
  const { sizename } = useAppLayout()

  const outerSpacing = (3 / 4) * contentPadding
  const availableWidth = columnWidth - 2 * separatorThickSize - 2 * outerSpacing

  const hasReachedColumnLimit = columnIds.length >= constants.COLUMNS_LIMIT

  const isFabVisible = shouldRenderFAB({ sizename })

  return (
    <ModalColumn
      iconName="plus"
      name="ADD_COLUMN"
      showBackButton={showBackButton}
      title="Add Column"
    >
      {!(installationOwnerNames && installationOwnerNames.length) &&
        username !== 'appledevhub' && (
          <HeaderMessage>
            <Link
              analyticsLabel="install-github-app-to-unlock-private-repository-support"
              href={getGitHubAppInstallUri()}
              openOnNewTab
              textProps={{
                color: 'foregroundColorMuted60',
                style: {
                  flexGrow: 1,
                  lineHeight: 14,
                  fontSize: 11,
                  textAlign: 'center',
                },
              }}
            >
              ✨ Install the GitHub App to unlock Private Repositories
            </Link>
          </HeaderMessage>
        )}

      <ScrollView
        style={sharedStyles.flex}
        contentContainerStyle={sharedStyles.flexGrow}
      >
        {columnTypes.map((group, groupIndex) => (
          <View key={`add-column-header-group-${groupIndex}`}>
            <SubHeader muted={group.soon} title={group.title}>
              {!!group.soon && (
                <Link
                  analyticsLabel={`add-column-${group.title}-soon`}
                  href={group.soonLink}
                >
                  <H2
                    muted
                    withMargin={false}
                    children={
                      group.soonLink && group.soonLink.includes('beta')
                        ? ' (beta)'
                        : ' (soon)'
                    }
                    style={sharedStyles.flex}
                  />
                </Link>
              )}
            </SubHeader>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignContent: 'flex-start',
                paddingHorizontal: outerSpacing,
                marginBottom: outerSpacing,
              }}
            >
              {group.items.map((item, itemIndex) => (
                <AddColumnModalItem
                  key={`add-column-button-group-${groupIndex}-item-${itemIndex}`}
                  availableWidth={availableWidth}
                  disabled={
                    hasReachedColumnLimit || !item.payload || group.soon
                  }
                  icon={item.icon}
                  payload={item.payload}
                  title={item.title}
                />
              ))}
            </View>
          </View>
        ))}

        {!!hasReachedColumnLimit && (
          <ThemedText
            color="foregroundColorMuted60"
            style={{
              marginTop: contentPadding,
              paddingHorizontal: contentPadding,
              lineHeight: 20,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {`You have reached the limit of ${
              constants.COLUMNS_LIMIT
            } columns. This is to maintain a healthy usage of the GitHub API.`}
          </ThemedText>
        )}

        <Spacer flex={1} minHeight={contentPadding} />

        <Spacer
          height={isFabVisible ? fabSize + 2 * fabSpacing : contentPadding}
        />
      </ScrollView>
    </ModalColumn>
  )
}
